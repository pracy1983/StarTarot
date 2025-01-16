interface ErrorStateProps {
  message: string
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="text-red-500">{message}</div>
    </div>
  )
} 