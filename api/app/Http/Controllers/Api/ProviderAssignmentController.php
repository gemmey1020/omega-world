<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DispatchStateException;
use App\Http\Controllers\Controller;
use App\Models\DispatchAssignment;
use App\Services\Dispatch\EscalationService;
use App\Services\Dispatch\OrderDispatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderAssignmentController extends Controller
{
    public function accept(
        Request $request,
        DispatchAssignment $assignment,
        OrderDispatchService $orderDispatchService,
        EscalationService $escalationService,
    ): JsonResponse
    {
        $currentNonce = $escalationService->assignmentNonce($assignment);
        $requestNonce = (string) $request->query('nonce', '');

        if (! hash_equals($currentNonce, $requestNonce)) {
            $assignment->loadMissing('order:id,status');

            return response()->json([
                'message' => 'Assignment link is stale.',
                'current_state' => [
                    'order_id' => $assignment->order?->id,
                    'order_status' => $assignment->order?->status,
                    'assignment_id' => $assignment->id,
                    'assignment_status' => $assignment->status,
                    'nonce_stale' => true,
                ],
            ], 409);
        }

        try {
            $order = $orderDispatchService->acceptAssignment($assignment->id);
        } catch (DispatchStateException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'current_state' => $exception->context,
            ], 409);
        }

        return response()->json([
            'data' => [
                'order_id' => $order->id,
                'status' => $order->status,
            ],
        ]);
    }
}
