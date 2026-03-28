export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md rounded-lg bg-red-50 p-4 text-center">
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}
