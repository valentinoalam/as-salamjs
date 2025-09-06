/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckIcon, XCircle, ChevronDown, XIcon } from "lucide-react"

import { cn } from "#@/lib/utils/utils.ts"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

const multiSelectVariants = cva(
  "m-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300",
  {
    variants: {
      variant: {
        default: "border-foreground/10 text-foreground bg-card hover:bg-card/80",
        secondary: "border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        inverted: "inverted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

type OptionItem = {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  className?: string
  variant?: string
  custom?: string
  isDefault?: boolean
}

interface MultiSelectProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof multiSelectVariants> {
  options: OptionItem[]
  onValueChange: (value: string[]) => void
  defaultValue?: string[]
  placeholder?: string
  maxCount?: number
  className?: string
  customColors?: Record<string, string>
  minimumItems?: any[]
  defaultItem?: string
  allItem?: {
    value: string
    label: string
    icon?: React.ComponentType<{ className?: string }>
    className?: string
    custom?: string
    isDefault?: boolean
  }
}

export const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      options,
      onValueChange,
      variant,
      defaultValue = [],
      placeholder = "Select options",
      maxCount = 3,
      className,
      customColors = {},
      minimumItems = [],
      defaultItem,
      allItem,
      ...props
    },
    ref,
  ) => {
    const [selectedValues, setSelectedValues] = React.useState<string[]>(defaultValue)
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)

    // Update selectedValues when defaultValue changes
    React.useEffect(() => {
      setSelectedValues(defaultValue)
    }, [defaultValue])

    // Get all selectable options (excluding the allItem if it exists)
    const selectableOptions = options.filter((option) => !allItem || option.value !== allItem.value)

    const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        setIsPopoverOpen(true)
      } else if (event.key === "Backspace" && !event.currentTarget.value) {
        const newSelectedValues = [...selectedValues]
        const lastItem = newSelectedValues.pop()

        if (lastItem && !minimumItems.includes(lastItem)) {
          const option = options.find((o) => o.value === lastItem)
          if (!option?.isDefault) {
            setSelectedValues(newSelectedValues)
            onValueChange(newSelectedValues)
          }
        }
      }
    }

    const toggleOption = (optionValue: string) => {
      const option = options.find((o) => o.value === optionValue)

      // Don't allow removing minimum items or default items
      if (selectedValues.includes(optionValue)) {
        if (minimumItems.includes(optionValue) || option?.isDefault) {
          return
        }
      }

      // Handle "all" logic - if admin is selected, it replaces all other roles
      if (allItem && optionValue === allItem.value) {
        if (selectedValues.includes(allItem.value)) {
          // Deselecting admin, clear to minimum items only
          const finalValues = [...minimumItems]
          setSelectedValues(finalValues)
          return
        } else {
          // Selecting admin, replace all with admin + minimum items
          const finalValues = [allItem.value, ...minimumItems.filter((item) => item !== allItem.value)]
          setSelectedValues(finalValues)
          return
        }
      }

      // If admin is already selected and we're trying to add another role, don't allow it
      if (allItem && selectedValues.includes(allItem.value) && optionValue !== allItem.value) {
        return
      }

      // Normal toggle logic
      const newSelectedValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((value) => value !== optionValue)
        : [...selectedValues, optionValue]

      setSelectedValues(newSelectedValues)
    }

    const handleClear = () => {
      const newSelectedValues = defaultItem ? [defaultItem] : minimumItems
      setSelectedValues(newSelectedValues)
      onValueChange(newSelectedValues)
    }

    const handlePopoverClose = (open: boolean) => {
      if (!open && isPopoverOpen) {
        onValueChange(selectedValues)
      }
      setIsPopoverOpen(open)
    }

    const getOptionClassName = (option: (typeof options)[0]) => {
      const baseClassName = option.className || ""
      const customClassName = option.custom && customColors[option.custom] ? customColors[option.custom] : ""
      return cn(baseClassName, customClassName)
    }

    return (
      <Popover open={isPopoverOpen} onOpenChange={handlePopoverClose} modal={false}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            {...props}
            onClick={() => setIsPopoverOpen(true)}
            className={cn(
              "flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-inherit hover:bg-inherit [&_svg]:pointer-events-auto",
              className,
            )}
          >
            {selectedValues.length > 0 ? (
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-wrap items-center">
                  {selectedValues.slice(0, maxCount).map((value) => {
                    const option =
                      options.find((o) => o.value === value) || (allItem && allItem.value === value ? allItem : null)
                    const IconComponent = option?.icon
                    const isMinimum = minimumItems.includes(value)
                    const isDefault = option?.isDefault

                    return (
                      <Badge
                        key={value}
                        className={cn(
                          getOptionClassName((option || {}) as OptionItem),
                          multiSelectVariants({ variant }),
                        )}
                      >
                        {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
                        {option?.label}
                        {!isMinimum && !isDefault && (
                          <XCircle
                            className="ml-2 h-4 w-4 cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleOption(value)
                            }}
                          />
                        )}
                      </Badge>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <XIcon
                    className="h-4 mx-2 cursor-pointer text-muted-foreground"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleClear()
                    }}
                  />
                  <Separator orientation="vertical" className="flex min-h-6 h-full" />
                  <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full mx-auto">
                <span className="text-sm text-muted-foreground mx-3">{placeholder}</span>
                <ChevronDown className="h-4 cursor-pointer text-muted-foreground mx-2" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" onEscapeKeyDown={() => setIsPopoverOpen(false)}>
          <Command>
            <CommandInput placeholder="Search..." onKeyDown={handleInputKeyDown} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {/* Render allItem if it exists */}
                {allItem && (
                  <CommandItem
                    key={allItem.value}
                    onSelect={() => toggleOption(allItem.value)}
                    className={cn("cursor-pointer", getOptionClassName(allItem))}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        selectedValues.includes(allItem.value)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    {allItem.icon && <allItem.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                    <span>{allItem.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">(Replaces all other roles)</span>
                  </CommandItem>
                )}

                {/* Render regular options - disable if admin is selected */}
                {selectableOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value)
                  const isMinimum = minimumItems.includes(option.value)
                  const isDefault = option.isDefault
                  const isDisabled = allItem && selectedValues.includes(allItem.value) && option.value !== allItem.value

                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => !isDisabled && toggleOption(option.value)}
                      className={cn(
                        "cursor-pointer",
                        getOptionClassName(option),
                        isDisabled && "opacity-50 cursor-not-allowed",
                      )}
                      disabled={isDisabled}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                          isDisabled && "opacity-30",
                        )}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </div>
                      {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                      <span className={isDisabled ? "text-muted-foreground" : ""}>{option.label}</span>
                      {(isMinimum || isDefault) && (
                        <span className="ml-2 text-xs text-muted-foreground">(Required)</span>
                      )}
                      {isDisabled && <span className="ml-2 text-xs text-muted-foreground">(Covered by Admin)</span>}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <div className="flex items-center justify-between">
                  {selectedValues.length > 0 && (
                    <>
                      <CommandItem onSelect={handleClear} className="flex-1 justify-center cursor-pointer">
                        Clear
                      </CommandItem>
                      <Separator orientation="vertical" className="flex min-h-6 h-full" />
                    </>
                  )}
                  <CommandItem
                    onSelect={() => setIsPopoverOpen(false)}
                    className="flex-1 justify-center cursor-pointer max-w-full"
                  >
                    Close
                  </CommandItem>
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  },
)

MultiSelect.displayName = "MultiSelect"
