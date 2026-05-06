export function GradientMesh({ className, ...props }: any) {
  return (
    <div className={`w-full h-full bg-gradient-to-br from-[#bcecf6] via-[#00aaff] to-[#ffd447] ${className || ''}`} {...props} />
  )
}
