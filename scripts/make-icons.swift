// Renders the app icons (vermilion seal with 日) – run: swift scripts/make-icons.swift public/icons
import AppKit
let out = CommandLine.arguments[1]
func icon(size: Int, maskable: Bool, rounded: Bool, name: String) {
  let s = CGFloat(size)
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  let paper = NSColor(red: 0.965, green: 0.945, blue: 0.906, alpha: 1)
  let seal = NSColor(red: 0.784, green: 0.271, blue: 0.180, alpha: 1)
  if maskable || !rounded {
    seal.setFill(); NSRect(x: 0, y: 0, width: s, height: s).fill()
  } else {
    paper.setFill(); NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: s, height: s), xRadius: s * 0.22, yRadius: s * 0.22).fill()
    let inset = s * 0.12
    seal.setFill(); NSBezierPath(roundedRect: NSRect(x: inset, y: inset, width: s - 2 * inset, height: s - 2 * inset), xRadius: s * 0.16, yRadius: s * 0.16).fill()
  }
  let fontSize = s * (maskable ? 0.42 : rounded ? 0.48 : 0.56)
  let font = NSFont(name: "HiraMinProN-W6", size: fontSize) ?? NSFont.boldSystemFont(ofSize: fontSize)
  let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor(red: 1, green: 0.973, blue: 0.94, alpha: 1)]
  let str = NSAttributedString(string: "日", attributes: attrs)
  let b = str.size()
  str.draw(at: NSPoint(x: (s - b.width) / 2, y: (s - b.height) / 2 - s * 0.01))
  NSGraphicsContext.restoreGraphicsState()
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(out)/\(name)"))
}
icon(size: 192, maskable: false, rounded: true, name: "icon-192.png")
icon(size: 512, maskable: false, rounded: true, name: "icon-512.png")
icon(size: 512, maskable: true, rounded: false, name: "icon-maskable-512.png")
icon(size: 180, maskable: false, rounded: false, name: "apple-touch-icon.png")
print("icons written")
