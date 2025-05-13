// import { Server } from "socket.io"
// import { getProdukHewan, getErrorLogs } from "@/lib/db"

// export const dynamic = "force-dynamic"

// export async function GET(req: Request) {
//   try {
//     if (!(global as any).io) {
//       console.log("New Socket.io server...")
//       ;(global as any).io = new Server({
//         path: "/api/socket",
//         addTrailingSlash: false,
//         cors: {
//           origin: "*", 
//           methods: ["GET", "POST"], 
//         },
//       })
//     }

//     const io = (global as any).io

//     io.on("connection", async (socket: any) => {
//       console.log("Socket connected:", socket.id)

//       // Send initial data to the client
//       const products = await getProdukHewan()
//       const errorLogs = await getErrorLogs()

//       socket.emit("update-product", { products })
//       socket.emit("error-logs", { errorLogs })

//       // Handle update-hewan event
//       socket.on("update-hewan", (data: any) => {
//         console.log("update-hewan:", data)
//         socket.broadcast.emit("update-hewan", data)
//       })

//       // Handle update-product event
//       socket.on("update-product", async (data: any) => {
//         console.log("update-product:", data)

//         // Broadcast updated data to all clients
//         const products = await getProdukHewan()
//         io.emit("update-product", { products })

//         // Check for errors and broadcast them
//         const errorLogs = await getErrorLogs()
//         io.emit("error-logs", { errorLogs })
//       })

//       socket.on("disconnect", () => {
//         console.log("Socket disconnected:", socket.id)
//       })
//     })

//     return new Response("Socket is running", {
//       status: 200,
//       headers: {
//         "Access-Control-Allow-Origin": "*",
//         "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
//         "Access-Control-Allow-Headers": "Content-Type, Authorization",
//       },
//     })
//   } catch (error) {
//     console.error("Socket error:", error)
//     return new Response("Error initializing socket", {
//       status: 500,
//     })
//   }
// }

// // Add OPTIONS method to handle preflight requests
// export async function OPTIONS(req: Request) {
//   return new Response(null, {
//     status: 204,
//     headers: {
//       "Access-Control-Allow-Origin": "*",
//       "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type, Authorization",
//       "Access-Control-Max-Age": "86400",
//     },
//   })
// }
import { Server } from "socket.io"
import { getProdukHewan, getErrorLogs } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server";
type NextApiResponseWithSocket = NextResponse & {
  socket: {
    server: {
      io?: Server;
    };
  };
};
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, res: NextApiResponseWithSocket) {
  try {
    // Get the headers from the request
    const headers = Object.fromEntries(req.headers)

    // Check if the socket server is already initialized
    if (!res.socket.server.io && !(global as any).io) {
      console.log("New Socket.io server initializing...")

      // Create a new Socket.IO server with proper CORS and transport configuration
      ;(global as any).io = new Server({
        path: "/api/socket",
        addTrailingSlash: false,
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
          credentials: true,
        },
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

      console.log("Socket.io server initialized successfully")
    }

    const io = (global as any).io

    io.on("connection", async (socket: any) => {
      console.log("Socket connected:", socket.id, "transport:", socket.conn.transport.name)
      
      socket.on("message", (data: any) => {
        console.log("Received message:", data);
        io.emit("message-response", data);
      });
      
      // Send initial data to the client
      const products = await getProdukHewan()
      const errorLogs = await getErrorLogs()

      socket.emit("update-product", { products })
      socket.emit("error-logs", { errorLogs })

      // Log transport change events
      socket.conn.on("upgrade", (transport: any) => {
        console.log("Socket transport upgraded from", socket.conn.transport.name, "to", transport.name)
      })

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

       // Handle ping event for connection testing
       socket.on("ping", (callback: (arg0: { status: string; time: number; }) => void) => {
        if (typeof callback === "function") {
          callback({ status: "ok", time: Date.now() })
        } else {
          socket.emit("pong", { status: "ok", time: Date.now() })
        }
      })
      
      socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id)
      })
    })

    return NextResponse.json({
      status: "Socket is running",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "text/plain",
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("Socket error:", error)
    return NextResponse.json(
      { error: "WebSocket initialization failed" },
      { status: 500 }
    );
  }
}

// Add OPTIONS method to handle preflight requests
export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  })
}
