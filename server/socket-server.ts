import type { Server as HTTPServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import { getProdukHewan, getErrorLogs } from "@/lib/db"

export function setupSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.on("connection", async (socket) => {
    console.log(`Socket connected: ${socket.id} using transport: ${socket.conn.transport.name}`)

    // Log transport changes
    socket.conn.on("upgrade", (transport) => {
      console.log(`Socket ${socket.id} transport upgraded from ${socket.conn.transport.name} to ${transport.name}`)
    })

    // Send initial data to the client
    try {
      const products = await getProdukHewan()
      const errorLogs = await getErrorLogs()

      socket.emit("update-product", { products })
      socket.emit("error-logs", { errorLogs })
    } catch (error) {
      console.error("Error fetching initial data:", error)
      socket.emit("server-error", { message: "Failed to fetch initial data" })
    }

    // Handle update-hewan event
    socket.on("update-hewan", (data) => {
      console.log("update-hewan:", data)
      socket.broadcast.emit("update-hewan", data)
    })

    // Handle update-product event
    socket.on("update-product", async (data) => {
      console.log("update-product:", data)

      try {
        // Broadcast updated data to all clients
        const products = await getProdukHewan()
        io.emit("update-product", { products })

        // Check for errors and broadcast them
        const errorLogs = await getErrorLogs()
        io.emit("error-logs", { errorLogs })
      } catch (error) {
        console.error("Error updating products:", error)
        socket.emit("server-error", { message: "Failed to update products" })
      }
    })

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`)
    })
  })

  return io
}
