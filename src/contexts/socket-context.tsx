"use client"

import type React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { toast } from "@/hooks/use-toast"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  transportType: string
  error: Error | null
  reconnectAttempts: number
  latency: number | null
}
const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  transportType: "not connected",
  error: null,
  reconnectAttempts: 0,
  latency: null,
})

const SOCKET_OPTIONS = {
  path: "/api/socket",
  addTrailingSlash: false,
  forceNew: true, 
  withCredentials: true,
  // Explicitly prefer WebSocket transport
  transports: ["websocket", "polling"],
  // Reconnection settings
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  // Enable auto connect
  autoConnect: true,
  // agent: new http.Agent({
  //   keepAlive: true,
  //   maxSockets: Infinity
  // }),
  query: { // Add versioning if needed
    clientType: "web-v1"
  },
  upgrade: true,
  rememberUpgrade: true,
};
export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [transportType, setTransportType] = useState<string>("not connected")
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [latency, setLatency] = useState<number | null>(null)
  const socketRef = useRef<Socket | null>(null);
  
  
  useEffect(() => {
    const initializeSocket = () => {
      if (typeof window === "undefined") return null;
      if (!socketRef.current) {
        try {
          // 3. Environment detection with fallback
          const socketUrl = process.env.NODE_ENV === "production"
            ? window.location.origin
            : process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
    
          // 4. Validate URL format
          if (!/^https?:\/\//.test(socketUrl)) {
            throw new Error(`Invalid socket URL: ${socketUrl}`);
          }
    
          console.log("Initializing socket connection to:", socketUrl);
          
          // 5. Create instance with validated options
          socketRef.current = io(socketUrl, SOCKET_OPTIONS,);
    
          // 6. Immediate connection test
          socketRef.current.once("connect", () => {
            console.log("Initial connection established");
          });
    
        } catch (error) {
          console.error("Socket initialization failed:", error);
          // 7. Reset ref on failure
          socketRef.current = null;
          throw error; // Propagate error for error boundaries
        }
      }
    
      return socketRef.current;
    };
    // Only initialize socket on client side
    if (socketRef.current) {
      console.log("Socket instance already exists, skipping creation.");
      // Jika sudah ada tapi belum di state (jarang terjadi), set state
      if (!socket) setSocket(socketRef.current);
      return;
    }

    console.log("Initializing new socket connection...");
    // Buat instance socket baru
    const socketInstance = initializeSocket();
    if (!socketInstance) return

    // Set socket instance
    setSocket(socketInstance)
    socketRef.current = socketInstance;
    // Add event listeners
    const onConnect = () => {
      console.log("Socket connected with ID:", socketInstance.id)
      console.log("Connected via", socketInstance.io.engine.transport.name)
      setIsConnected(true)

      setTransportType(socketInstance.io.engine.transport.name)
      setReconnectAttempts(0)
      setError(null)

      // Measure latency
      measureLatency(socketInstance)

      // Set up periodic latency measurement
      const latencyInterval = setInterval(() => {
        measureLatency(socketInstance)
      }, 30000)

      return () => {
        clearInterval(latencyInterval)
      }
    }
    
    // Function to measure latency
    const measureLatency = (socketInstance: Socket) => {
      const start = Date.now()

      socketInstance.emit("ping", () => {
        const duration = Date.now() - start
        setLatency(duration)
      })
    }

    const onDisconnect = (reason: string) => {
      console.log("Socket disconnected", reason)
      setIsConnected(false)
      setTransportType("not connected")
      setLatency(null)

      if (reason === "io server disconnect") {
        // The server has forcefully disconnected the socket
        toast({
          title: "Disconnected",
          description: "Server has disconnected the socket. Attempting to reconnect...",
        })
        socketInstance.connect()
      }
    }

    const onTransportChange = () => {
      if (socketInstance.connected) {
        const transport = socketInstance.io.engine.transport.name
        console.log("Transport changed to:", transport)
        setTransportType(transport)
      }
    }

    const onConnectError = (err: Error) => {
      console.error("Socket connection error:", err.message)
      setIsConnected(false)
      setTransportType("not connected");
      setError(err);
      setReconnectAttempts((prev) => prev + 1)
      if (reconnectAttempts >= 5) {
        toast({
          title: "Connection Error",
          description: "Failed to connect to server after multiple attempts. Please refresh the page.",
          variant: "destructive",
        })
      }
    }

    socketInstance.on("connect", onConnect)
    socketInstance.on("disconnect", onDisconnect)
    socketInstance.on("connect_error", onConnectError)
    socketInstance.io.engine.on("upgrade", onTransportChange)

    // Check if already connected
    if (socketInstance.connected) {
      onConnect()
    }

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up socket connection...");
      if (socketInstance) {
        socketInstance.off("connect", onConnect)
        socketInstance.off("disconnect", onDisconnect)
        socketInstance.off("connect_error", onConnectError)
        socketInstance.io.engine.off("upgrade", onTransportChange)
        // Hanya panggil disconnect jika masih terhubung atau sedang mencoba
        if (socketInstance.connected || socketInstance.active) {
          socketInstance.disconnect();
          console.log("Socket explicitly disconnected.");
        } else {
          console.log("Socket was not connected, no need to disconnect.");
        }
      }
      // Reset state dan ref
      setSocket(null);
      socketRef.current = null;
      setIsConnected(false);
      setTransportType("not connected");
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected, transportType, error, reconnectAttempts, latency }}>
      {children}
    </SocketContext.Provider>
  )
}
