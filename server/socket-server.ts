import type { Server as HTTPServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import { getProdukHewan, getErrorLogs } from "#@/lib/server/repositories/qurban.ts"

export function setupSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    allowEIO3: true,
    // Explicitly configure transports to prefer WebSockets
    transports: ["websocket", "polling"],
    // Increase ping timeout to prevent disconnections
    pingTimeout: 60000,
    pingInterval: 25000,
    // Connection timeout
    connectTimeout: 45000,
    // Allow upgrades to WebSocket
    allowUpgrades: true,
    // Increase buffer size for large payloads
    maxHttpBufferSize: 1e8,
    // Disable per-message deflate compression (can cause issues)
    perMessageDeflate: false,
  })
  let connectedClients = 0

  io.on("connection", async (socket) => {
    connectedClients++
    console.log(`Socket connected: ${socket.id} using transport: ${socket.conn.transport.name}`)
    console.log(`Total connected clients: ${connectedClients}`)
    io.emit("clients", `Total connected clients: ${connectedClients}`);

    socket.on("message", (data) => {
      console.log("Received message:", data);
      io.emit("message-response", data);
    });

    // Log transport changes
    socket.conn.on("upgrade", (transport) => {
      console.log(`Socket ${socket.id} transport upgraded from ${socket.conn.transport.name} to ${transport.name}`)
    })

    // Send initial data to the client
    // try {
    //   const products = await getProdukHewan()
    //   const errorLogs = await getErrorLogs()

    //   socket.emit("update-product", { products })
    //   socket.emit("error-logs", { errorLogs })
    // } catch (error) {
    //   console.error("Error fetching initial data:", error)
    //   socket.emit("server-error", { message: "Failed to fetch initial data" })
    // }

    // Handle update-hewan event
    socket.on("update-hewan", (data) => {
      io.emit("update-hewan", data)
      // callback({ success: true, message: "Updated" });
    })

    // // Handle update-product event
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

    // Handle ping event for connection testing
    socket.on("ping", (callback: (arg0: { status: string; time: number; }) => void) => {
      if (typeof callback === "function") {
        callback({ status: "ok", time: Date.now() })
      } else {
        io.emit("pong", { status: "ok", time: Date.now() })
      }
    })

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      connectedClients--
      console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`)
      console.log(`Total connected clients: ${connectedClients}`)
      io.emit("client", `Total connected clients: ${connectedClients}`)
    })
  })
  // Broadcast system status every minute
  setInterval(async () => {
    try {
      const systemStatus = {
        connectedClients,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      }

      io.emit("system-status", systemStatus)
    } catch (error) {
      console.error("Error broadcasting system status:", error)
    }
  }, 60000)

  return io
}
