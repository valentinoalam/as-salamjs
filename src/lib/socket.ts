"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export const initializeSocket = () => {
  if (!socket) {
    const socketUrl = process.env.NODE_ENV === "production" ? window.location.origin : "http://localhost:3000"

    socket = io(socketUrl, {
      path: "/api/socket",
    })
  }
  return socket
}

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const socketInstance = initializeSocket()

    const onConnect = () => {
      setIsConnected(true)
    }

    const onDisconnect = () => {
      setIsConnected(false)
    }

    socketInstance.on("connect", onConnect)
    socketInstance.on("disconnect", onDisconnect)

    return () => {
      socketInstance.off("connect", onConnect)
      socketInstance.off("disconnect", onDisconnect)
    }
  }, [])

  return { socket: socket as Socket, isConnected }
}
