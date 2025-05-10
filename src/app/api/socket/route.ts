import { Server } from "socket.io"
import { getProdukHewan, getErrorLogs } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    if (!(global as any).io) {
      console.log("New Socket.io server...")
      ;(global as any).io = new Server({
        path: "/api/socket",
        addTrailingSlash: false,
      })
    }

    const io = (global as any).io

    io.on("connection", async (socket: any) => {
      console.log("Socket connected:", socket.id)

      // Send initial data to the client
      const products = await getProdukHewan()
      const errorLogs = await getErrorLogs()

      socket.emit("update-product", { products })
      socket.emit("error-logs", { errorLogs })

      // Handle update-hewan event
      socket.on("update-hewan", (data: any) => {
        console.log("update-hewan:", data)
        socket.broadcast.emit("update-hewan", data)
      })

      // Handle update-product event
      socket.on("update-product", async (data: any) => {
        console.log("update-product:", data)

        // Broadcast updated data to all clients
        const products = await getProdukHewan()
        io.emit("update-product", { products })

        // Check for errors and broadcast them
        const errorLogs = await getErrorLogs()
        io.emit("error-logs", { errorLogs })
      })

      socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id)
      })
    })

    return new Response("Socket is running", {
      status: 200,
    })
  } catch (error) {
    console.error("Socket error:", error)
    return new Response("Error initializing socket", {
      status: 500,
    })
  }
}
