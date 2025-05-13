"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initializeSocket = () => {
  if (typeof window === "undefined") return
  if (!socket) {
    const socketUrl =
      process.env.NODE_ENV === "production"
        ? window.location.origin
        : "http://localhost:3000";

    socket = io(socketUrl, {
      path: "/api/socket",
      autoConnect: false, // Don't connect automatically
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      // Timeout settings
      timeout: 20000,
    });
  }
  return socket;
};

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  const socketInstance = initializeSocket(); // Initialize socket immediately
  // console.log(socketInstance)
  useEffect(() => {
    if (!socketInstance) return; // Prevent errors if initialization fails

    const onConnect = () => {
      setIsConnected(true);
      setTransport(socket?.io.engine.transport.name!);
      console.log("Connected!");
      socket?.io.engine.on("upgrade", (transport) => {
        setTransport(transport.name);
      });
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onError = (error: Error) => {
      console.error("Socket connection error:", error);
    };

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("connect_error", onError);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("connect_error", onError);
    };
  }, [socketInstance]); // Depend on socketInstance to handle potential re-initialization

  return { socket: socketInstance as Socket, isConnected };
};