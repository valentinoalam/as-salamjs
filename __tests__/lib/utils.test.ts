import { cn } from "@/lib/utils"

describe("Utils", () => {
  describe("cn function", () => {
    it("should merge class names correctly", () => {
      const result = cn("text-red-500", "bg-blue-500")
      expect(result).toBe("text-red-500 bg-blue-500")
    })

    it("should handle conditional classes", () => {
      const result = cn("text-red-500", true && "bg-blue-500", false && "hidden")
      expect(result).toBe("text-red-500 bg-blue-500")
    })

    it("should handle undefined and null values", () => {
      const result = cn("text-red-500", undefined, null, "bg-blue-500")
      expect(result).toBe("text-red-500 bg-blue-500")
    })

    it("should override conflicting classes", () => {
      const result = cn("text-red-500", "text-blue-500")
      expect(result).toBe("text-blue-500")
    })
  })
})
