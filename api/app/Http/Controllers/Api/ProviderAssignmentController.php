<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\DispatchStateException;
use App\Http\Controllers\Controller;
use App\Models\DispatchAssignment;
use App\Services\Dispatch\OrderDispatchService;
use Illuminate\Http\JsonResponse;

class ProviderAssignmentController extends Controller
{
    public function accept(DispatchAssignment $assignment, OrderDispatchService $orderDispatchService): JsonResponse
    {
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
