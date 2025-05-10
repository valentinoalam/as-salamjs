
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useOrder, AnimalType } from "@/contexts/order-context";

import { Loader2, PlusCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const formSchema = z.object({
  animalType: z.enum(["goat", "sheep", "cow", "camel"] as const),
  quantity: z.coerce.number().positive().min(0.1),
  onBehalfOf: z.array(z.string().min(1, "Name is required")),
  specialInstructions: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const animalPrices = {
  goat: 250,
  sheep: 300,
  cow: 2100, // Total price for a cow
  camel: 3500, // Total price for a camel
};

const CreateOrderForm: React.FC = () => {
  const { data: session } = useSession();
  const { createOrder } = useOrder();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [names, setNames] = useState<string[]>([""]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      animalType: "goat",
      quantity: 1,
      onBehalfOf: [""],
      specialInstructions: "",
    },
  });

  const selectedAnimalType = form.watch("animalType") as AnimalType;
  const selectedQuantity = form.watch("quantity");

  const calculateTotal = () => {
    if (selectedAnimalType === "cow" || selectedAnimalType === "camel") {
      // For cow and camel, quantity represents share (0.14 to 1)
      return animalPrices[selectedAnimalType] * selectedQuantity;
    } else {
      // For goat and sheep, quantity is whole number
      return animalPrices[selectedAnimalType] * selectedQuantity;
    }
  };

  const addNameField = () => {
    setNames([...names, ""]);
  };

  const removeNameField = (index: number) => {
    const newNames = [...names];
    newNames.splice(index, 1);
    setNames(newNames);
  };

  const updateName = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
    form.setValue("onBehalfOf", newNames.filter((name) => name.trim() !== ""));
  };

  const onSubmit = async (values: FormValues) => {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotal();

      // Filter out any empty names
      const filteredNames = values.onBehalfOf.filter(
        (name) => name.trim() !== ""
      );

      if (filteredNames.length === 0) {
        form.setError("onBehalfOf", {
          type: "manual",
          message: "At least one name is required",
        });
        setIsSubmitting(false);
        return;
      }

      const order = await createOrder({
        userId: session.user.id,
        userName: session.user.name,
        animalType: values.animalType,
        quantity: values.quantity,
        onBehalfOf: filteredNames,
        totalAmount,
      });

      // Reset form and navigate to the order detail page
      form.reset();
      router.push(`/order/${order.id}`);
    } catch (error) {
      console.error("Failed to create order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium mb-4">Make Your Qurbani Order</h3>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="animalType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Animal Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select animal type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="goat">Goat</SelectItem>
                      <SelectItem value="sheep">Sheep</SelectItem>
                      <SelectItem value="cow">Cow (Share)</SelectItem>
                      <SelectItem value="camel">Camel (Share)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {selectedAnimalType === "cow"
                      ? "A cow is typically divided into 7 equal shares."
                      : selectedAnimalType === "camel"
                      ? "A camel can be divided into multiple shares."
                      : `One full ${selectedAnimalType} for sacrifice.`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedAnimalType === "cow" || selectedAnimalType === "camel"
                      ? "Share Amount"
                      : "Quantity"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      min={
                        selectedAnimalType === "cow" ||
                        selectedAnimalType === "camel"
                          ? "0.14" // Minimum 1/7th share for cow/camel
                          : "1" // Minimum 1 for goat/sheep
                      }
                      step={
                        selectedAnimalType === "cow" ||
                        selectedAnimalType === "camel"
                          ? "0.14" // 1/7th step for cow/camel
                          : "1" // Whole numbers for goat/sheep
                      }
                      max={
                        selectedAnimalType === "cow" ||
                        selectedAnimalType === "camel"
                          ? "1" // Maximum 1 (full animal) for cow/camel
                          : "10" // Maximum 10 for goat/sheep
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    {selectedAnimalType === "cow" || selectedAnimalType === "camel"
                      ? "Enter your share (e.g., 0.14 for 1/7th, 1 for whole animal)"
                      : "Number of animals"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormField
              control={form.control}
              name="onBehalfOf"
              render={() => (
                <FormItem>
                  <FormLabel>On Behalf Of</FormLabel>
                  <FormDescription className="mb-2">
                    Enter the name(s) for whom this sacrifice is being performed
                  </FormDescription>
                  <div className="space-y-2">
                    {names.map((name, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={name}
                          onChange={(e) => updateName(index, e.target.value)}
                          placeholder={`Name ${index + 1}`}
                          className="flex-1"
                        />
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeNameField(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNameField}
                    className="mt-2"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Another Name
                  </Button>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="specialInstructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Instructions (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any special instructions or requests..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border rounded-md p-4 bg-muted/30">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">Order Summary</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedAnimalType === "cow" || selectedAnimalType === "camel"
                    ? `${
                        selectedQuantity * 100
                      }% share of ${selectedAnimalType}`
                    : `${selectedQuantity} ${selectedAnimalType}(s)`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">${calculateTotal().toFixed(2)}</p>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              "Proceed to Payment"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateOrderForm;