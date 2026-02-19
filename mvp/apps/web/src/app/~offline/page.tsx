export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="bg-primary text-primary-foreground mx-auto flex size-16 items-center justify-center rounded-2xl text-2xl">
          &#9889;
        </div>
        <h1 className="text-2xl font-bold tracking-tight">You are offline</h1>
        <p className="text-muted-foreground max-w-sm">
          Please check your internet connection and try again. The application requires a network connection to function.
        </p>
      </div>
    </div>
  );
}
