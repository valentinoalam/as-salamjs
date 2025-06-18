export function ConnectionStatus({isConnected}:{ isConnected:boolean }) {
  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 border border-green-300">
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
        <span className="text-sm font-medium text-green-800">{isConnected ? "Terhubung" : "Terputus"}</span>
      </div>
    </div>
  )
}
