//  ParticleReward.swift
//  Particles converge out of the ambient field into a line-art form.
//
//  Drop into any SwiftUI project, iOS 17+.
//  Preview at the bottom. Tap to replay.

import SwiftUI
import CoreHaptics

// ─────────────────────────────────────────────────────────────
// TOKENS  (DESIGN.md)
// ─────────────────────────────────────────────────────────────
private let copper      = Color(red: 0.784, green: 0.475, blue: 0.255)
private let copperUI    = UIColor(red: 0.784, green: 0.475, blue: 0.255, alpha: 1)
private let copperLight = Color(red: 0.910, green: 0.659, blue: 0.486)

// ─────────────────────────────────────────────────────────────
// 1 · SAMPLE ANY SWIFTUI VIEW INTO POINTS
//     Render -> read alpha -> keep the opaque pixels.
//     Stroke rather than fill, and you get an outline of points.
// ─────────────────────────────────────────────────────────────
@MainActor
func samplePoints<V: View>(from view: V,
                           size: CGSize,
                           count: Int,
                           alphaCutoff: UInt8 = 40) -> [CGPoint] {

    let renderer = ImageRenderer(content: view.frame(width: size.width,
                                                     height: size.height))
    renderer.scale = 1
    guard let cg = renderer.cgImage else { return [] }

    let w = cg.width, h = cg.height
    var bytes = [UInt8](repeating: 0, count: w * h * 4)
    guard let ctx = CGContext(data: &bytes, width: w, height: h,
                              bitsPerComponent: 8, bytesPerRow: w * 4,
                              space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { return [] }
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))

    var hits: [CGPoint] = []
    for y in 0..<h {
        for x in 0..<w where bytes[(y * w + x) * 4 + 3] > alphaCutoff {
            hits.append(CGPoint(x: CGFloat(x), y: CGFloat(y)))
        }
    }
    guard !hits.isEmpty else { return [] }

    // even spread rather than clumping
    hits.shuffle()
    if hits.count > count { return Array(hits.prefix(count)) }
    // fewer pixels than particles: repeat with a tiny jitter
    return (0..<count).map { i in
        let p = hits[i % hits.count]
        return CGPoint(x: p.x + .random(in: -0.6...0.6),
                       y: p.y + .random(in: -0.6...0.6))
    }
}

// ─────────────────────────────────────────────────────────────
// 2 · PARTICLE
// ─────────────────────────────────────────────────────────────
private struct Particle {
    var home: CGPoint        // where it drifts when idle
    var target: CGPoint      // where it sits inside the form
    var size: CGFloat
    var opacity: Double
    var phase: Double        // drift offset
    var period: Double
    var amp: CGFloat
    var delay: Double        // per-particle stagger, keeps it organic
}

// ─────────────────────────────────────────────────────────────
// 3 · THE VIEW
// ─────────────────────────────────────────────────────────────
struct ParticleRewardView<Target: View>: View {

    let target: Target                  // what the particles form
    var particleCount: Int = 420
    var onFinish: () -> Void = {}

    @State private var particles: [Particle] = []
    @State private var canvasSize: CGSize = .zero
    @State private var t: Double = 0            // 0 = scattered, 1 = formed
    @State private var engine: CHHapticEngine?
    @State private var started = false

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation) { timeline in
                let now = timeline.date.timeIntervalSinceReferenceDate

                Canvas { ctx, size in
                    for p in particles {
                        // ambient drift
                        let dx = sin(now / p.period + p.phase) * p.amp
                        let dy = cos(now / (p.period * 1.4) + p.phase) * p.amp * 0.55
                        let drifting = CGPoint(x: p.home.x + dx, y: p.home.y + dy)

                        // per-particle eased progress
                        let local = min(max((t - p.delay) / (1 - p.delay), 0), 1)
                        let e = easeOutBack(local)

                        let x = drifting.x + (p.target.x - drifting.x) * e
                        let y = drifting.y + (p.target.y - drifting.y) * e

                        // brighten and tighten as they land
                        let s = p.size * (1 + 0.35 * e)
                        let o = p.opacity + (0.95 - p.opacity) * e

                        let rect = CGRect(x: x - s/2, y: y - s/2, width: s, height: s)
                        ctx.fill(Path(ellipseIn: rect),
                                 with: .color(e > 0.85 ? copperLight : copper))
                        ctx.opacity = 1
                        _ = o
                    }
                }
                .opacity(1)
            }
            .onAppear {
                canvasSize = geo.size
                build(in: geo.size)
                prepareHaptics()
                if !started { started = true; run() }
            }
            .contentShape(Rectangle())
            .onTapGesture { t = 0; run() }          // replay
        }
        .background(Color.black)
        .ignoresSafeArea()
    }

    // ── build the particle set ───────────────────────────────
    @MainActor
    private func build(in size: CGSize) {
        let box = min(size.width, size.height) * 0.55
        let raw = samplePoints(from: target,
                               size: CGSize(width: box, height: box),
                               count: particleCount)

        let ox = (size.width  - box) / 2
        let oy = (size.height - box) / 2 - size.height * 0.06

        particles = raw.map { pt in
            Particle(
                // ambient home: the bottom third, per DESIGN.md
                home: CGPoint(x: .random(in: 0...size.width),
                              y: size.height * .random(in: 0.62...1.02)),
                target: CGPoint(x: pt.x + ox, y: pt.y + oy),
                size: .random(in: 2.0...4.2),
                opacity: .random(in: 0.18...0.55),
                phase: .random(in: 0...(.pi * 2)),
                period: .random(in: 9...16),
                amp: .random(in: 12...28),
                delay: .random(in: 0...0.22)        // stagger
            )
        }
    }

    // ── the sequence ─────────────────────────────────────────
    private func run() {
        // 0 – 700ms: slow gather, haptic ramp
        withAnimation(.easeIn(duration: 0.70)) { t = 0.25 }
        rampHaptic(duration: 0.70)

        // 700 – 900ms: the pause. This is what makes it land.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.90) {
            // snap
            withAnimation(.interpolatingSpring(stiffness: 210, damping: 16)) {
                t = 1.0
            }
            impact(1.0)
        }

        // hold, then dissolve back into the ambient field
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.2) {
            withAnimation(.easeInOut(duration: 1.1)) { t = 0 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) { onFinish() }
        }
    }

    // slight overshoot on arrival
    private func easeOutBack(_ x: Double) -> Double {
        let c1 = 1.70158, c3 = c1 + 1
        return 1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2)
    }

    // ── haptics ──────────────────────────────────────────────
    private func prepareHaptics() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        engine = try? CHHapticEngine()
        try? engine?.start()
    }

    private func rampHaptic(duration: TimeInterval) {
        guard let engine else { return }
        let ev = CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [.init(parameterID: .hapticIntensity, value: 0.25),
                         .init(parameterID: .hapticSharpness, value: 0.3)],
            relativeTime: 0, duration: duration)
        let curve = CHHapticParameterCurve(
            parameterID: .hapticIntensityControl,
            controlPoints: [.init(relativeTime: 0, value: 0.2),
                            .init(relativeTime: duration, value: 0.9)],
            relativeTime: 0)
        if let pattern = try? CHHapticPattern(events: [ev], parameterCurves: [curve]),
           let player = try? engine.makePlayer(with: pattern) {
            try? player.start(atTime: 0)
        }
    }

    private func impact(_ strength: Float) {
        let gen = UIImpactFeedbackGenerator(style: .heavy)
        gen.prepare()
        gen.impactOccurred(intensity: CGFloat(strength))
    }
}

// ─────────────────────────────────────────────────────────────
// 4 · THE 7-DAY STREAK SCREEN
// ─────────────────────────────────────────────────────────────
struct SevenDayStreakScreen: View {
    @State private var showCopy = false

    // stroked, so the particles land on an OUTLINE not a solid blob
    private var streakMark: some View {
        ZStack {
            Circle().stroke(Color.white, lineWidth: 6)
            Text("7")
                .font(.system(size: 150, weight: .light, design: .rounded))
                .foregroundStyle(Color.white)
        }
        .padding(18)
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ParticleRewardView(target: streakMark, particleCount: 460)

            VStack {
                Spacer()
                VStack(spacing: 10) {
                    Text("SEVEN DAYS")
                        .font(.system(size: 13, weight: .semibold))
                        .tracking(1.2)
                        .foregroundStyle(.white.opacity(0.62))
                    Text("Every dose, every day.")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(.white)
                }
                .opacity(showCopy ? 1 : 0)
                .offset(y: showCopy ? 0 : 12)
                .padding(.bottom, 90)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.5).delay(1.25)) { showCopy = true }
        }
    }
}

#Preview {
    SevenDayStreakScreen()
}
