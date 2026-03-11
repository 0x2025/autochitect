import * as React from "react"
import { cn } from "@/lib/utils"

interface WindowProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    onClose?: () => void;
    icon?: React.ReactNode;
}

export function Window({ title, children, className, onClose, icon, ...props }: WindowProps) {
    return (
        <div className={cn("win98-window flex flex-source flex-col", className)} {...props}>
            <div className="win98-title-bar">
                <div className="flex items-center gap-1">
                    {icon}
                    <span>{title}</span>
                </div>
                <div className="flex gap-0.5">
                    <button className="win98-title-bar-btn">?</button>
                    <button className="win98-title-bar-btn" onClick={onClose}>x</button>
                </div>
            </div>
            <div className="p-4 bg-win-gray">
                {children}
            </div>
        </div>
    )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    inset?: boolean;
}

export function Button({ className, inset, ...props }: ButtonProps) {
    return (
        <button
            className={cn(
                "win98-btn text-sm font-windows active:shadow-none",
                inset && "win98-inset",
                className
            )}
            {...props}
        />
    )
}
