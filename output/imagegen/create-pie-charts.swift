import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

let output = URL(fileURLWithPath: CommandLine.arguments[1])
let blue = CGColor(red: 53/255, green: 123/255, blue: 216/255, alpha: 1)
let pale = CGColor(red: 231/255, green: 242/255, blue: 255/255, alpha: 1)
let navy = CGColor(red: 30/255, green: 58/255, blue: 112/255, alpha: 1)
for percent in [97, 40] {
    let context = CGContext(data: nil, width: 1200, height: 1400, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    context.setAllowsAntialiasing(true)
    context.setFillColor(pale)
    context.fillEllipse(in: CGRect(x: 80, y: 280, width: 1040, height: 1040))
    let start = Double.pi / 2
    let end = start - Double(percent) / 100 * 2 * Double.pi
    context.setFillColor(blue)
    context.move(to: CGPoint(x: 600, y: 800))
    context.addArc(center: CGPoint(x: 600, y: 800), radius: 520, startAngle: start, endAngle: end, clockwise: true)
    context.closePath()
    context.fillPath()
    let font = CTFontCreateWithName("AvenirNext-Bold" as CFString, 132, nil)
    let attributed = NSAttributedString(string: "\(percent)%", attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font, NSAttributedString.Key(kCTForegroundColorAttributeName as String): navy])
    let line = CTLineCreateWithAttributedString(attributed)
    let width = CTLineGetTypographicBounds(line, nil, nil, nil)
    context.textPosition = CGPoint(x: (1200 - width) / 2, y: 95)
    CTLineDraw(line, context)
    let image = context.makeImage()!
    let file = output.appendingPathComponent("yipyip-pie-\(percent)-transparent.png")
    let destination = CGImageDestinationCreateWithURL(file as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(destination, image, nil)
    precondition(CGImageDestinationFinalize(destination))
    print(file.path)
}
