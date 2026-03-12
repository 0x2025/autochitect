import * as React from "react"
import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
}

export function Card({ title, children, className, ...props }: CardProps) {
    return (
        <div className={cn("ui-card flex flex-col overflow-hidden", className)} {...props}>
            {title && (
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <span className="text-sm font-bold text-gray-900 tracking-tight capitalize">{title}</span>
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
        </div>
    )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary";
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
    return (
        <button
            className={cn(
                "ui-btn flex items-center justify-center gap-2",
                variant === "secondary" && "ui-btn-secondary",
                className
            )}
            {...props}
        />
    )
}

// Keep Window export for backward compatibility during transition, mapping to Card
export const Window = Card;
