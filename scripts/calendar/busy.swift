// Prints your Apple Calendar events from now until the end of the day after tomorrow as JSON:
// [{"start": ISO, "end": ISO, "title": "..."}] – times and titles only, all-day events left out.
// The study app's rolling plan treats them as busy. Run once in Terminal to allow calendar access:
//   swift scripts/calendar/busy.swift
// The Mac job (canvas_sync.py --calendar) calls it the same way.
import EventKit
import Foundation

let store = EKEventStore()
let done = DispatchSemaphore(value: 0)
var allowed = false
if #available(macOS 14.0, *) {
    store.requestFullAccessToEvents { ok, _ in allowed = ok; done.signal() }
} else {
    store.requestAccess(to: .event) { ok, _ in allowed = ok; done.signal() }
}
done.wait()
guard allowed else {
    FileHandle.standardError.write("No calendar access – allow it in System Settings → Privacy & Security → Calendars.\n".data(using: .utf8)!)
    exit(2)
}

let now = Date()
let cal = Calendar.current
let end = cal.date(byAdding: .day, value: 3, to: cal.startOfDay(for: now))!
let events = store.events(matching: store.predicateForEvents(withStart: now.addingTimeInterval(-3600), end: end, calendars: nil))
let iso = ISO8601DateFormatter()
let out = events
    .filter { !$0.isAllDay && $0.availability != .free }
    .map { ["start": iso.string(from: $0.startDate), "end": iso.string(from: $0.endDate), "title": $0.title ?? ""] }
let data = try JSONSerialization.data(withJSONObject: out, options: [])
print(String(data: data, encoding: .utf8)!)
