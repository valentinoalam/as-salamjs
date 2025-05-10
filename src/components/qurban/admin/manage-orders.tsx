'use client'
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  Filter,
  Loader,
  MoreHorizontal,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { OrderStatus, useOrder } from "@/contexts/order-context";

const ManageOrders: React.FC = () => {
  const { orders, updateOrderStatus, animals, assignAnimalToOrder } = useOrder();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("pending");
  const [statusNote, setStatusNote] = useState("");
  const [selectedAnimalId, setSelectedAnimalId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAssigningAnimal, setIsAssigningAnimal] = useState(false);
  
  // Get available animals (for assigning to orders)
  const availableAnimals = animals.filter(a => a.status === "available");

  // Filter orders by status and search term
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Sort orders by creation date, newest first
  const sortedOrders = [...filteredOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleUpdateStatus = async () => {
    if (!selectedOrderId || !newStatus) return;
    
    setIsUpdating(true);
    
    try {
      await updateOrderStatus(selectedOrderId, newStatus, statusNote);
      setStatusNote("");
      setSelectedOrderId(null);
    } catch (error) {
      console.error("Failed to update order status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignAnimal = async () => {
    if (!selectedOrderId || !selectedAnimalId) return;
    
    setIsAssigningAnimal(true);
    
    try {
      await assignAnimalToOrder(selectedOrderId, selectedAnimalId);
      setSelectedAnimalId("");
      setSelectedOrderId(null);
    } catch (error) {
      console.error("Failed to assign animal:", error);
    } finally {
      setIsAssigningAnimal(false);
    }
  };

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
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by order ID or customer name..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select onValueChange={setStatusFilter} defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="payment-confirmed">Payment Confirmed</SelectItem>
              <SelectItem value="animal-assigned">Animal Assigned</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="slaughtered">Slaughtered</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="distributed">Distributed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Animal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  No orders found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              sortedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>
                    {format(new Date(order.createdAt), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>{order.userName}</TableCell>
                  <TableCell className="capitalize">
                    {order.animalType}
                    {order.quantity !== 1 &&
                      ` (${
                        order.quantity < 1
                          ? `${order.quantity * 100}% share`
                          : `x${order.quantity}`
                      })`}
                  </TableCell>
                  <TableCell>{renderStatusBadge(order.status)}</TableCell>
                  <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => {
                              e.preventDefault();
                              setSelectedOrderId(order.id);
                              setNewStatus(order.status);
                            }}>
                              Update Status
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update Order Status</DialogTitle>
                              <DialogDescription>
                                Change the status for order #{selectedOrderId}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="status">New Status</Label>
                                <Select
                                  value={newStatus}
                                  onValueChange={(value) => setNewStatus(value as OrderStatus)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select new status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="payment-confirmed">
                                      Payment Confirmed
                                    </SelectItem>
                                    <SelectItem value="animal-assigned">
                                      Animal Assigned
                                    </SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="slaughtered">Slaughtered</SelectItem>
                                    <SelectItem value="processed">Processed</SelectItem>
                                    <SelectItem value="distributed">Distributed</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea
                                  id="notes"
                                  value={statusNote}
                                  onChange={(e) => setStatusNote(e.target.value)}
                                  placeholder="Add any additional details..."
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSelectedOrderId(null)}>
                                Cancel
                              </Button>
                              <Button onClick={handleUpdateStatus} disabled={isUpdating}>
                                {isUpdating ? "Updating..." : "Update Status"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        {order.status === "payment-confirmed" && !order.animalId && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => {
                                e.preventDefault();
                                setSelectedOrderId(order.id);
                              }}>
                                Assign Animal
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Assign Animal</DialogTitle>
                                <DialogDescription>
                                  Select an animal to assign to order #{selectedOrderId}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="animal">Select Animal</Label>
                                  <Select
                                    value={selectedAnimalId}
                                    onValueChange={setSelectedAnimalId}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose an animal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableAnimals.length === 0 ? (
                                        <SelectItem value="" disabled>
                                          No available animals
                                        </SelectItem>
                                      ) : (
                                        availableAnimals
                                          .filter(a => a.type === order.animalType)
                                          .map((animal) => (
                                            <SelectItem key={animal.id} value={animal.id}>
                                              {animal.type.charAt(0).toUpperCase() + animal.type.slice(1)}{" "}
                                              - {animal.id} ({animal.location})
                                            </SelectItem>
                                          ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setSelectedOrderId(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleAssignAnimal}
                                  disabled={!selectedAnimalId || isAssigningAnimal}
                                >
                                  {isAssigningAnimal ? "Assigning..." : "Assign Animal"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Cancel Order
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ManageOrders;
