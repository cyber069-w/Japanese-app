import PDFKit
import Foundation
let src = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!
let base = CommandLine.arguments[2]
let data = try! Data(contentsOf: URL(fileURLWithPath: base + "/manifest.json"))
let items = try! JSONSerialization.jsonObject(with: data) as! [[String: Any]]
for it in items {
  let s = it["startPage"] as! Int, e = it["endPage"] as! Int, f = it["file"] as! String
  let out = PDFDocument()
  for p in (s - 1)...(e - 1) { if let page = src.page(at: p) { out.insert(page, at: out.pageCount) } }
  out.write(to: URL(fileURLWithPath: "\(base)/lessons/\(f).pdf"))
}
print("split \(items.count)")
