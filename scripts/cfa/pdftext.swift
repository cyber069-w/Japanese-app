import PDFKit
import Foundation
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let doc = PDFDocument(url: url) else { print("cannot open"); exit(1) }
var out = ""
for i in 0..<doc.pageCount {
  out += "\n\n=====PAGE \(i + 1)=====\n"
  out += doc.page(at: i)?.string ?? ""
}
try! out.write(to: URL(fileURLWithPath: CommandLine.arguments[2]), atomically: true, encoding: .utf8)
print("pages: \(doc.pageCount), chars: \(out.count)")
