import React from "react";
import { useOrder } from "@/contexts/order-context";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ChevronRight,
  CircleAlert,
  Clock,
  Loader,
} from "lucide-react";

interface OrderListProps {
  userId?: string;
  limit?: number;
}

const OrderList: React.FC<OrderListProps> = ({ userId, limit }) => {
  const { orders } = useOrder();
  const router = useRouter();

  // Filter orders by userId if provided, otherwise show all
  const filteredOrders = userId
    ? orders.filter((order) => order.userId === userId)
    : orders;

  // Limit the number of orders shown if specified
  const limitedOrders = limit
    ? filteredOrders.slice(0, limit)
    : filteredOrders;

  // Sort orders by creation date, newest first
  const sortedOrders = [...limitedOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "payment-confirmed":
      case "animal-assigned":
      case "scheduled":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            <Loader className="w-3 h-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      case "slaughtered":
      case "processed":
      case "distributed":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            <Loader className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="border-green-600 text-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <CircleAlert className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  if (sortedOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Orders</CardTitle>
          <CardDescription>You have not placed any orders yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/qurbani")}>Place an Order</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedOrders.map((order) => (
        <Card key={order.id} className="group">
          <div className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-lg">Order #{order.id}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              {renderStatusBadge(order.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Animal</p>
                <p className="font-medium capitalize">
                  {order.animalType}
                  {order.quantity !== 1 &&
                    ` (${
                      order.quantity < 1
                        ? `${order.quantity * 100}% share`
                        : `x${order.quantity}`
                    })`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On Behalf Of</p>
                <p className="font-medium">
                  {order.onBehalfOf.join(", ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-2 justify-between group-hover:bg-primary/5 transition-colors"
              onClick={() => router.push(`/order/${order.id}`)}
            >
              View Details
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}

      {limit && filteredOrders.length > limit && (
        <div className="text-center mt-4">
          <Button variant="outline" onClick={() => router.push("/orders")}>
            View All Orders
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrderList;
