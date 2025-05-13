"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

type SocketContextType = {
  socket: Socket | null
  isConnected: boolean
  transportType: string
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  transportType: "not connected",
})

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [transportType, setTransportType] = useState<string>("not connected")

  useEffect(() => {
    // Only initialize socket on client side
    if (typeof window === "undefined") return

    const socketUrl = process.env.NODE_ENV === "production" 
      ? window.location.origin 
      : "http://localhost:3000"

    console.log("Socket Provider: Initializing socket connection to:", socketUrl)

    const socketInstance = io(socketUrl, {
      path: "/api/socket/",
      forceNew: true, 
      withCredentials: true,
      // Explicitly prefer WebSocket transport
      transports: ["websocket", "polling"],
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Enable auto connect
      autoConnect: true,
    })

    // Set socket instance
    setSocket(socketInstance)

    // Add event listeners
    const onConnect = () => {
      console.log("Socket connected with ID:", socketInstance.id)
      console.log("Transport used:", socketInstance.io.engine.transport.name)
      setIsConnected(true)
      setTransportType(socketInstance.io.engine.transport.name)
    }

    const onDisconnect = () => {
      console.log("Socket disconnected")
      setIsConnected(false)
      setTransportType("not connected")
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
    }

    socketInstance.on("connect", onConnect)
    socketInstance.on("disconnect", onDisconnect)
    socketInstance.on("connect_error", onConnectError)
    socketInstance.io.engine.on("upgrade", onTransportChange)

    // Check if already connected
    if (socketInstance.connected) {
      setIsConnected(true)
      setTransportType(socketInstance.io.engine.transport.name)
    }
  // Manually connect with timeout
  const connectionTimeout = setTimeout(() => {
    socketInstance.connect();
  }, 1000); // Delay connection attempt

    // Cleanup on unmount
    return () => {
      clearTimeout(connectionTimeout);
      socketInstance.off("connect", onConnect)
      socketInstance.off("disconnect", onDisconnect)
      socketInstance.off("connect_error", onConnectError)
      socketInstance.io.engine.off("upgrade", onTransportChange)
      socketInstance.disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected, transportType }}>
      {children}
    </SocketContext.Provider>
  )
}