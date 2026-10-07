const m = require('mongoose'); require('dotenv').config();

// ================== SVG DIAGRAMS ==================

// M1 SVGs
const m1svg1 = '<div style="background:rgba(15,25,60,0.5);border-radius:16px;padding:20px;margin:20px 0;">' +
'<svg viewBox="0 0 640 260" width="100%" xmlns="http://www.w3.org/2000/svg">' +
'<text x="320" y="24" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#60a5fa">The CIA Triad</text>' +
'<circle cx="180" cy="140" r="60" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" stroke-width="2"/>' +
'<text x="180" y="135" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#60a5fa">Confidentiality</text>' +
'<text x="180" y="155" text-anchor="middle" font-family="Arial" font-size="11" fill="#94a3b8">Secrecy of data</text>' +
'<circle cx="320" cy="80" r="60" fill="rgba(20,184,166,0.15)" stroke="#14b8a6" stroke-width="2"/>' +
'<text x="320" y="78" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#5eead4">Integrity</text>' +
'<text x="320" y="98" text-anchor="middle" font-family="Arial" font-size="11" fill="#94a3b8">Accuracy, trust</text>' +
'<circle cx="460" cy="140" r="60" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" stroke-width="2"/>' +
'<text x="460" y="135" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fbbf24">Availability</text>' +
'<text x="460" y="155" text-anchor="middle" font-family="Arial" font-size="11" fill="#94a3b8">Uptime when needed</text>' +
'<text x="320" y="240" text-anchor="middle" font-family="Arial" font-size="11" fill="#64748b">Every security control defends at least one of these three pillars</text>' +
'</svg></div>';

const m1svg2 = '<div style="background:rgba(15,25,60,0.5);border-radius:16px;padding:20px;margin:20px 0;">' +
'<svg viewBox="0 0 640 240" width="100%" xmlns="http://www.w3.org/2000/svg">' +
'<text x="320" y="24" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#60a5fa">Red Team vs Blue Team vs Purple Team</text>' +
'<rect x="40" y="60" width="160" height="120" rx="12" fill="rgba(239,68,68,0.15)" stroke="#ef4444" stroke-width="2"/>' +
'<text x="120" y="90" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fca5a5">RED TEAM</text>' +
'<text x="120" y="115" text-anchor="middle" font-family="Arial" font-size="11" fill="#cbd5e1">Offensive</text>' +
'<text x="120" y="135" text-anchor="middle" font-family="Arial" font-size="11" fill="#cbd5e1">Simulate attacks</text>' +
'<text x="120" y="155" text-anchor="middle" font-family="Arial" font-size="11" fill="#cbd5e1">Find weaknesses</text>' +
'<rect x="240" y="60" width="160" height="120" rx="12" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" stroke-width="2"/>' +
'<text x="320" y="90" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#93c5fd">BLUE TEAM</text>' +
'<text x="320" y="115" text-anchor="middle" font-family="Arial" font-size="11" fill="#cbd5e1">Defensive</text>' +
'<text x="320" y="135" text-anchor="middle" font-family="Arial" font-size="11" fill="#cbd5e1">Detect + respond</text>' +
'<text x="320" y="155" text-anchor="middle" font-family="Arial" font-size="11" fill="#cbd5e1">Monitor + hunt</text>' +
'<rect x="440" y="60" width="160" height="120" rx="12" fill="rgba(168,85,247,0.15)" stroke="#a855f7" stroke-width="2"/>' +
'<text x="520" y="90" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#d8b4fe">PURPLE TEAM</text>' +
'<text x="520" y="115" text-anchor="middle" font-family="Arial" font-size="11" fill="#cbd5e1">Collaboration</text>' +
'<text x="520" y="135" text-anchor="middle" font-family="Arial" font-size="11" fill="#cbd5e1">Share TTPs</text>' +
'<text x="520" y="155" text-anchor="middle" font-family="Arial" font-size="11" fill="#cbd5e1">Improve both</text>' +
'<text x="320" y="215" text-anchor="middle" font-family="Arial" font-size="11" fill="#64748b">OCA focuses on the BLUE side of this triad</text>' +
'</svg></div>';

const m1svg3 = '<div style="background:rgba(15,25,60,0.5);border-radius:16px;padding:20px;margin:20px 0;">' +
'<svg viewBox="0 0 640 300" width="100%" xmlns="http://www.w3.org/2000/svg">' +
'<text x="320" y="24" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#60a5fa">SOC Tier Structure</text>' +
'<rect x="240" y="50" width="160" height="50" rx="8" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" stroke-width="2"/>' +
'<text x="320" y="70" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#fbbf24">Tier 3 — Threat Hunter</text>' +
'<text x="320" y="88" text-anchor="middle" font-family="Arial" font-size="10" fill="#cbd5e1">Proactive, deep analysis</text>' +
'<rect x="240" y="120" width="160" height="50" rx="8" fill="rgba(20,184,166,0.15)" stroke="#14b8a6" stroke-width="2"/>' +
'<text x="320" y="140" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#5eead4">Tier 2 — Incident Responder</text>' +
'<text x="320" y="158" text-anchor="middle" font-family="Arial" font-size="10" fill="#cbd5e1">Investigates alerts escalated</text>' +
'<rect x="240" y="190" width="160" height="50" rx="8" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" stroke-width="2"/>' +
'<text x="320" y="210" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#93c5fd">Tier 1 — Alert Triage</text>' +
'<text x="320" y="228" text-anchor="middle" font-family="Arial" font-size="10" fill="#cbd5e1">Entry level, monitors dashboards</text>' +
'<line x1="320" y1="100" x2="320" y2="120" stroke="#64748b" stroke-width="2" marker-end="url(#arrow1)"/>' +
'<line x1="320" y1="170" x2="320" y2="190" stroke="#64748b" stroke-width="2"/>' +
'<text x="520" y="270" text-anchor="middle" font-family="Arial" font-size="11" fill="#64748b">OCA prepares you for Tier 1 → Tier 2</text>' +
'</svg></div>';

// M2 SVGs
const m2svg1 = '<div style="background:rgba(15,25,60,0.5);border-radius:16px;padding:20px;margin:20px 0;">' +
'<svg viewBox="0 0 640 260" width="100%" xmlns="http://www.w3.org/2000/svg">' +
'<text x="320" y="24" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#60a5fa">TCP Three-Way Handshake</text>' +
'<text x="120" y="70" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#93c5fd">Client</text>' +
'<text x="520" y="70" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#93c5fd">Server</text>' +
'<line x1="160" y1="60" x2="480" y2="60" stroke="#475569" stroke-width="1" stroke-dasharray="4"/>' +
'<line x1="160" y1="90" x2="470" y2="140" stroke="#22c55e" stroke-width="2" marker-end="url(#a2)"/>' +
'<text x="320" y="112" text-anchor="middle" font-family="Arial" font-size="11" fill="#22c55e">1. SYN (seq=x)</text>' +
'<line x1="470" y1="155" x2="170" y2="205" stroke="#3b82f6" stroke-width="2"/>' +
'<text x="320" y="185" text-anchor="middle" font-family="Arial" font-size="11" fill="#60a5fa">2. SYN-ACK (seq=y, ack=x+1)</text>' +
'<line x1="160" y1="220" x2="470" y2="245" stroke="#22c55e" stroke-width="2"/>' +
'<text x="320" y="240" text-anchor="middle" font-family="Arial" font-size="11" fill="#22c55e">3. ACK (ack=y+1) — connection established</text>' +
'<text x="320" y="175" text-anchor="middle" font-family="Arial" font-size="10" fill="#64748b">Analysts watch for SYN floods, half-open scans, and RST anomalies</text>' +
'</svg></div>';

const m2svg2 = '<div style="background:rgba(15,25,60,0.5);border-radius:16px;padding:20px;margin:20px 0;">' +
'<svg viewBox="0 0 640 260" width="100%" xmlns="http://www.w3.org/2000/svg">' +
'<text x="320" y="24" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#60a5fa">OSI Model vs TCP/IP</text>' +
'<rect x="60" y="50" width="200" height="26" rx="4" fill="rgba(239,68,68,0.2)" stroke="#ef4444"/>' +
'<text x="160" y="68" text-anchor="middle" font-family="Arial" font-size="11" fill="#fca5a5">7. Application</text>' +
'<rect x="60" y="80" width="200" height="26" rx="4" fill="rgba(245,158,11,0.2)" stroke="#f59e0b"/>' +
'<text x="160" y="98" text-anchor="middle" font-family="Arial" font-size="11" fill="#fbbf24">6. Presentation</text>' +
'<rect x="60" y="110" width="200" height="26" rx="4" fill="rgba(168,85,247,0.2)" stroke="#a855f7"/>' +
'<text x="160" y="128" text-anchor="middle" font-family="Arial" font-size="11" fill="#d8b4fe">5. Session</text>' +
'<rect x="60" y="140" width="200" height="26" rx="4" fill="rgba(20,184,166,0.2)" stroke="#14b8a6"/>' +
'<text x="160" y="158" text-anchor="middle" font-family="Arial" font-size="11" fill="#5eead4">4. Transport (TCP/UDP)</text>' +
'<rect x="60" y="170" width="200" height="26" rx="4" fill="rgba(59,130,246,0.2)" stroke="#3b82f6"/>' +
'<text x="160" y="188" text-anchor="middle" font-family="Arial" font-size="11" fill="#93c5fd">3. Network (IP, ICMP)</text>' +
'<rect x="60" y="200" width="200" height="26" rx="4" fill="rgba(34,197,94,0.2)" stroke="#22c55e"/>' +
'<text x="160" y="218" text-anchor="middle" font-family="Arial" font-size="11" fill="#86efac">2. Data Link (Ethernet, ARP)</text>' +
'<rect x="60" y="230" width="200" height="26" rx="4" fill="rgba(148,163,184,0.2)" stroke="#94a3b8"/>' +
'<text x="160" y="248" text-anchor="middle" font-family="Arial" font-size="11" fill="#cbd5e1">1. Physical</text>' +
'<rect x="380" y="50" width="200" height="80" rx="6" fill="rgba(59,130,246,0.15)" stroke="#3b82f6"/>' +
'<text x="480" y="80" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#93c5fd">Application</text>' +
'<text x="480" y="105" text-anchor="middle" font-family="Arial" font-size="10" fill="#cbd5e1">HTTP, DNS, TLS, SSH</text>' +
'<rect x="380" y="140" width="200" height="50" rx="6" fill="rgba(20,184,166,0.15)" stroke="#14b8a6"/>' +
'<text x="480" y="165" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#5eead4">Transport</text>' +
'<text x="480" y="182" text-anchor="middle" font-family="Arial" font-size="10" fill="#cbd5e1">TCP, UDP</text>' +
'<rect x="380" y="200" width="200" height="56" rx="6" fill="rgba(245,158,11,0.15)" stroke="#f59e0b"/>' +
'<text x="480" y="225" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#fbbf24">Internet / Link</text>' +
'<text x="480" y="245" text-anchor="middle" font-family="Arial" font-size="10" fill="#cbd5e1">IP, Ethernet, WiFi</text>' +
'</svg></div>';

// M3 SVGs
const m3svg1 = '<div style="background:rgba(15,25,60,0.5);border-radius:16px;padding:20px;margin:20px 0;">' +
'<svg viewBox="0 0 640 280" width="100%" xmlns="http://www.w3.org/2000/svg">' +
'<text x="320" y="24" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#60a5fa">Windows Event Log Locations</text>' +
'<rect x="40" y="50" width="270" height="200" rx="10" fill="rgba(59,130,246,0.1)" stroke="#3b82f6"/>' +
'<text x="175" y="75" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#93c5fd">Windows</text>' +
'<text x="60" y="105" font-family="monospace" font-size="11" fill="#cbd5e1">Security.evtx</text>' +
'<text x="60" y="125" font-family="monospace" font-size="11" fill="#cbd5e1">System.evtx</text>' +
'<text x="60" y="145" font-family="monospace" font-size="11" fill="#cbd5e1">Application.evtx</text>' +
'<text x="60" y="165" font-family="monospace" font-size="11" fill="#cbd5e1">Microsoft-Windows-Sysmon</text>' +
'<text x="60" y="185" font-family="monospace" font-size="11" fill="#cbd5e1">PowerShell/Operational</text>' +
'<text x="60" y="205" font-family="monospace" font-size="11" fill="#cbd5e1">TerminalServices</text>' +
'<text x="60" y="230" font-family="Arial" font-size="10" fill="#64748b">Stored in C:\Windows\System32\winevt\Logs</text>' +
'<rect x="330" y="50" width="270" height="200" rx="10" fill="rgba(20,184,166,0.1)" stroke="#14b8a6"/>' +
'<text x="465" y="75" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#5eead4">Linux</text>' +
'<text x="350" y="105" font-family="monospace" font-size="11" fill="#cbd5e1">/var/log/auth.log</text>' +
'<text x="350" y="125" font-family="monospace" font-size="11" fill="#cbd5e1">/var/log/syslog</text>' +
'<text x="350" y="145" font-family="monospace" font-size="11" fill="#cbd5e1">/var/log/kern.log</text>' +
'<text x="350" y="165" font-family="monospace" font-size="11" fill="#cbd5e1">/var/log/audit/audit.log</text>' +
'<text x="350" y="185" font-family="monospace" font-size="11" fill="#cbd5e1">journalctl (systemd)</text>' +
'<text x="350" y="205" font-family="monospace" font-size="11" fill="#cbd5e1">~/.bash_history</text>' +
'<text x="350" y="230" font-family="Arial" font-size="10" fill="#64748b">Centralized via rsyslog / journald</text>' +
'</svg></div>';

const m3svg2 = '<div style="background:rgba(15,25,60,0.5);border-radius:16px;padding:20px;margin:20px 0;">' +
'<svg viewBox="0 0 640 260" width="100%" xmlns="http://www.w3.org/2000/svg">' +
'<text x="320" y="24" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#60a5fa">Anatomy of a Sysmon Event</text>' +
'<rect x="80" y="50" width="480" height="180" rx="10" fill="rgba(20,15,50,0.6)" stroke="#3b82f6"/>' +
'<text x="100" y="75" font-family="monospace" font-size="11" fill="#60a5fa">EventID: 1</text>' +
'<text x="100" y="95" font-family="monospace" font-size="11" fill="#cbd5e1">UtcTime: 2026-10-07 14:23:11</text>' +
'<text x="100" y="115" font-family="monospace" font-size="11" fill="#cbd5e1">Image: C:\Windows\System32\cmd.exe</text>' +
'<text x="100" y="135" font-family="monospace" font-size="11" fill="#cbd5e1">CommandLine: cmd.exe /c whoami</text>' +
'<text x="100" y="155" font-family="monospace" font-size="11" fill="#cbd5e1">ParentImage: C:\Windows\System32\powershell.exe</text>' +
'<text x="100" y="175" font-family="monospace" font-size="11" fill="#cbd5e1">User: CORP\jsmith</text>' +
'<text x="100" y="195" font-family="monospace" font-size="11" fill="#cbd5e1">ProcessGuid: {a1b2c3d4-...}</text>' +
'<text x="100" y="215" font-family="monospace" font-size="11" fill="#fbbf24">Hash: SHA256=A1B2C3...</text>' +
'<text x="320" y="250" text-anchor="middle" font-family="Arial" font-size="10" fill="#64748b">powerShell spawning cmd spawning whoami = classic recon chain</text>' +
'</svg></div>';

// ================== LESSON CONTENT ==================

const lesson1 = '<h2>Part 1 — What Cyber Defense Actually Is</h2>' +
'<p><strong>Cyber defense</strong> is the practice of protecting systems, networks, and data from unauthorized access, disruption, and theft. Where offensive security (EHP) asks <em>"how do I break in?"</em>, defensive security (OCA) asks <em>"how do I know they are breaking in, and how do I stop them?"</em>.</p>' +
'<p>Every organization with a network needs defenders. Every breach you read about in the news — Colonial Pipeline, SolarWinds, MOVEit, Change Healthcare — involved a defensive team that either missed the signs or caught them early enough to contain the damage. OCA trains you to be the one who catches them.</p>' +
'<h3>The CIA Triad — The Foundation</h3>' +
'<p>Every security control in existence defends one or more of three properties:</p>' +
'<ul>' +
'<li><strong>Confidentiality</strong> — only authorized people see the data. Defended by encryption, access controls, MFA.</li>' +
'<li><strong>Integrity</strong> — data is accurate and hasn\'t been tampered with. Defended by hashing, digital signatures, checksums, audit logs.</li>' +
'<li><strong>Availability</strong> — systems are up when needed. Defended by redundancy, DDoS protection, backups, failover.</li>' +
'</ul>' +
m1svg1 +
'<p>When you triage an alert, your first question is always: <em>which pillar is under attack?</em> A leaked database is a <strong>confidentiality</strong> breach. A tampered bank record is an <strong>integrity</strong> breach. A ransomwared file server is an <strong>availability</strong> breach.</p>' +
'<h3>Red vs Blue vs Purple</h3>' +
'<p>Security teams split into three camps:</p>' +
'<ul>' +
'<li><strong>Red Team</strong> — offensive. They attack the organization on purpose to find weaknesses before real attackers do. (That is EHP territory.)</li>' +
'<li><strong>Blue Team</strong> — defensive. They monitor, detect, investigate, and respond. (That is you.)</li>' +
'<li><strong>Purple Team</strong> — a collaboration between red and blue. Red shares their TTPs (tactics, techniques, procedures), blue tunes detections, and both sides improve.</li>' +
'</ul>' +
m1svg2 +
'<h3>The SOC — Where Analysts Work</h3>' +
'<p>A <strong>Security Operations Center (SOC)</strong> is the team and facility responsible for monitoring, detecting, and responding to security incidents 24/7. Most SOCs follow a three-tier model:</p>' +
'<ul>' +
'<li><strong>Tier 1 — Alert Triage:</strong> Monitors dashboards, reviews alerts from SIEM/EDR, closes obvious false positives, escalates suspicious ones. Entry-level role.</li>' +
'<li><strong>Tier 2 — Incident Responder:</strong> Investigates escalations, correlates events across multiple sources, contains threats, communicates with stakeholders.</li>' +
'<li><strong>Tier 3 — Threat Hunter / Senior IR:</strong> Proactively hunts for adversaries that automated tools missed, performs deep forensics, leads major incidents.</li>' +
'</ul>' +
m1svg3 +
'<h3>Real-World Scenario: The 3 AM Alert</h3>' +
'<p>You\'re a Tier 1 analyst on night shift. At 03:14 an alert fires: <em>"Multiple failed logins for user jsmith from IP 185.220.101.45 (Tor exit node)."</em> 47 failures in 90 seconds, then one success. Then the account immediately launches PowerShell and starts a scheduled task.</p>' +
'<p>What do you do? You don\'t close it as a false positive. You escalate to Tier 2 immediately with the timeline, the source IP, and the process tree. Tier 2 isolates the host, disables the account, and pulls memory. That is the job — pattern recognition under pressure, fast escalation when something smells wrong.</p>' +
'<h3>Real-World Scenario: When Defense Fails</h3>' +
'<p>In the <strong>Target breach (2013)</strong>, attackers compromised an HVAC vendor\'s credentials, moved laterally into Target\'s POS network, and exfiltrated 40 million credit card numbers. Target\'s FireEye and Symantec tools <em>did</em> alert — multiple times. But alerts weren\'t escalated. The defense technology worked; the defense <em>process</em> failed.</p>' +
'<p>Lesson: OCA is not just about knowing tools. It\'s about knowing what to do when the tool fires. That\'s what separates a Tier 1 who gets promoted from one who gets burned out.</p>' +
'<h3>What OCA Covers</h3>' +
'<p>Over 15 modules you will learn:</p>' +
'<ol>' +
'<li>How networks and protocols work so you can spot anomalies</li>' +
'<li>Where Windows and Linux store evidence</li>' +
'<li>How SIEM platforms aggregate and correlate logs</li>' +
'<li>How to use threat intelligence frameworks like MITRE ATT&CK</li>' +
'<li>Endpoint and network detection tools (EDR, IDS, Zeek)</li>' +
'<li>Malware analysis, phishing triage, incident response, forensics, threat hunting</li>' +
'<li>Vulnerability management and compliance</li>' +
'<li>Career paths and certification prep (CySA+, BTL1)</li>' +
'</ol>' +
'<h3>Key Terms</h3>' +
'<ul>' +
'<li><strong>CIA Triad</strong> — Confidentiality, Integrity, Availability; the three pillars of security.</li>' +
'<li><strong>Blue Team</strong> — Defensive security practitioners; OCA\'s focus.</li>' +
'<li><strong>Red Team</strong> — Offensive security practitioners; simulate real attacks.</li>' +
'<li><strong>Purple Team</strong> — Collaboration between red and blue to improve detection.</li>' +
'<li><strong>SOC</strong> — Security Operations Center; 24/7 monitoring team.</li>' +
'<li><strong>Tier 1/2/3</strong> — Analyst seniority levels in a SOC.</li>' +
'<li><strong>TTP</strong> — Tactics, Techniques, Procedures; how attackers operate.</li>' +
'<li><strong>IOC</strong> — Indicator of Compromise; evidence that a breach occurred.</li>' +
'<li><strong>MTTD / MTTR</strong> — Mean Time To Detect / Respond; key SOC metrics.</li>' +
'<li><strong>Alert Fatigue</strong> — Desensitization caused by too many false positives.</li>' +
'</ul>';

const lesson2 = '<h2>Part 1 — Why Analysts Must Understand Networking</h2>' +
'<p>Ninety percent of what you investigate as a cyber analyst happens <em>on the network</em>. Lateral movement, command-and-control callbacks, data exfiltration, malware downloads — all of it leaves network traces. If you can\'t read a packet capture or explain the difference between a SYN and a SYN-ACK, you\'re blind to half your evidence.</p>' +
'<p>This module rebuilds networking from the ground up, but through the lens of an analyst: not "how do I configure a router" but "what does this traffic look like when something is wrong?"</p>' +
'<h3>The OSI Model — In Plain English</h3>' +
'<p>The OSI model has 7 layers, but in practice analysts care about 4:</p>' +
'<ul>' +
'<li><strong>Layer 7 — Application:</strong> HTTP, DNS, TLS, SMB, SSH. This is where most attacks live.</li>' +
'<li><strong>Layer 4 — Transport:</strong> TCP and UDP. Ports live here. You\'ll filter traffic by port constantly.</li>' +
'<li><strong>Layer 3 — Network:</strong> IP addresses. Source and destination IPs are the bread and butter of network forensics.</li>' +
'<li><strong>Layer 2 — Data Link:</strong> MAC addresses, ARP. Matters for LAN-level attacks (ARP spoofing, MAC flooding).</li>' +
'</ul>' +
m2svg2 +
'<h3>TCP — The Protocol You Need to Master</h3>' +
'<p>Most enterprise traffic is TCP. Every TCP connection starts with a three-way handshake:</p>' +
'<ol>' +
'<li>Client sends <strong>SYN</strong> (I want to talk)</li>' +
'<li>Server replies <strong>SYN-ACK</strong> (OK, I hear you)</li>' +
'<li>Client sends <strong>ACK</strong> (Great, let\'s go)</li>' +
'</ol>' +
m2svg1 +
'<p>Why does this matter for defense? Because attackers abuse the handshake:</p>' +
'<ul>' +
'<li><strong>SYN flood (DoS):</strong> Thousands of SYNs from spoofed IPs, no final ACK. Server exhausts its connection table.</li>' +
'<li><strong>TCP SYN scan (nmap -sS):</strong> Attacker sends SYN, receives SYN-ACK, sends RST instead of ACK. Never completes the handshake — a classic port-scan signature.</li>' +
'<li><strong>Half-open connections:</strong> Many unfinished handshakes in a short window = scan or DoS in progress.</li>' +
'</ul>' +
'<h3>Ports You\'ll See Constantly</h3>' +
'<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">' +
'<tr style="background:rgba(59,130,246,0.15);"><th style="padding:8px;text-align:left;color:#93c5fd;">Port</th><th style="padding:8px;text-align:left;color:#93c5fd;">Protocol</th><th style="padding:8px;text-align:left;color:#93c5fd;">Analyst Relevance</th></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">22</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">SSH</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Brute force, lateral movement, tunneling</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">53</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">DNS</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">C2 beacons, DNS tunneling, DGA domains</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">80/443</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">HTTP/S</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Payload downloads, web shells, exfil over HTTPS</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">445</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">SMB</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">PsExec lateral movement, ransomware, EternalBlue</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">3389</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">RDP</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Ransomware entry, brute force, internal pivoting</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">5985/5986</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">WinRM</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">PowerShell remoting, lateral movement</td></tr>' +
'</table>' +
'<h3>Reading a Packet Capture</h3>' +
'<p>Wireshark is the tool. Here\'s the workflow:</p>' +
'<ol>' +
'<li><strong>Filter by host:</strong> <code>ip.addr == 10.0.0.5</code> to isolate a suspect machine.</li>' +
'<li><strong>Filter by port:</strong> <code>tcp.port == 445</code> to see SMB traffic only.</li>' +
'<li><strong>Filter by protocol:</strong> <code>dns</code>, <code>http</code>, <code>tls</code>.</li>' +
'<li><strong>Follow the stream:</strong> right-click a packet → Follow → TCP Stream to reconstruct a full conversation.</li>' +
'<li><strong>Look for anomalies:</strong> unusual ports, beaconing at regular intervals, large uploads to external IPs.</li>' +
'</ol>' +
'<h3>Real-World Scenario: C2 Beaconing</h3>' +
'<p>A workstation in Finance starts talking to <code>185.14.22.99:443</code> every 60 seconds, exactly on the minute, sending 312 bytes each time and receiving 89 bytes back. Over 8 hours. That is textbook command-and-control beaconing.</p>' +
'<p>A Tier 1 analyst might ignore it ("it\'s HTTPS, looks normal"). A trained analyst runs the destination IP through threat intel — it\'s a known Cobalt Strike C2 node. Escalation is immediate. The regularity and fixed size are the tell.</p>' +
'<h3>Real-World Scenario: DNS Tunneling</h3>' +
'<p>An internal host makes 2,000+ DNS queries in an hour, all to subdomains of <code>malicious-domain.com</code>, with random-looking labels like <code>a8f3j2h9f.malicious-domain.com</code>. Normal DNS traffic doesn\'t look like that. This is data being smuggled out over DNS — a technique popular with attackers because DNS is often allowed through firewalls unfiltered.</p>' +
'<h3>Key Terms</h3>' +
'<ul>' +
'<li><strong>OSI Model</strong> — 7-layer reference model for network communication.</li>' +
'<li><strong>TCP Three-Way Handshake</strong> — SYN → SYN-ACK → ACK; establishes a TCP connection.</li>' +
'<li><strong>UDP</strong> — Connectionless protocol; used by DNS, DHCP, VoIP, gaming, and many C2 channels.</li>' +
'<li><strong>Packet Capture (pcap)</strong> — Recorded network traffic for analysis.</li>' +
'<li><strong>Wireshark</strong> — Industry-standard packet analysis tool.</li>' +
'<li><strong>Beaconing</strong> — Regular, repeated callbacks to a C2 server; a strong compromise indicator.</li>' +
'<li><strong>DNS Tunneling</strong> — Encoding data inside DNS queries/responses to bypass firewalls.</li>' +
'<li><strong>North-South vs East-West Traffic</strong> — External vs internal network traffic.</li>' +
'<li><strong>NetFlow</strong> — Metadata about network flows (who talked to whom, how much, how long).</li>' +
'<li><strong>Five-Tuple</strong> — Source IP, source port, destination IP, destination port, protocol.</li>' +
'</ul>';

const lesson3 = '<h2>Part 1 — Where Evidence Lives</h2>' +
'<p>Modern operating systems are forensic goldmines. Every process launch, every login, every file modification, every network connection — logged, timestamped, and (usually) recoverable. Your job as an analyst is knowing <em>where</em> to look and <em>what</em> to correlate.</p>' +
'<p>This module is your map of Windows and Linux evidence locations.</p>' +
'<h3>Windows Event Logs — The Big Three</h3>' +
'<p>Windows stores logs as <code>.evtx</code> files in <code>C:\\Windows\\System32\\winevt\\Logs\\</code>. Three matter most:</p>' +
'<ul>' +
'<li><strong>Security.evtx</strong> — Logins, logouts, privilege use, account changes, object access. The single most important log for investigations.</li>' +
'<li><strong>System.evtx</strong> — OS-level events: driver loads, service starts, boot/shutdown.</li>' +
'<li><strong>Application.evtx</strong> — Application errors and events; often noisy but occasionally contains forensic value.</li>' +
'</ul>' +
'<h3>Windows Event IDs You Must Know</h3>' +
'<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">' +
'<tr style="background:rgba(59,130,246,0.15);"><th style="padding:8px;text-align:left;color:#93c5fd;">Event ID</th><th style="padding:8px;text-align:left;color:#93c5fd;">Meaning</th><th style="padding:8px;text-align:left;color:#93c5fd;">Why analysts care</th></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">4624</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Successful logon</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Baseline for "who logged in where, when, from what"</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">4625</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Failed logon</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Brute force, password spray, locked accounts</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">4648</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Logon with explicit credentials</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">RunAs, credential theft, lateral movement</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">4672</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Special privileges assigned</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Admin logon; high-signal for privilege escalation</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">4688</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Process creation</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">What ran, when, by whom, and its parent</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">4720</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">User account created</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Persistence; attackers often create accounts</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">4728/4732</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">User added to privileged group</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Direct indicator of privilege escalation</td></tr>' +
'<tr><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">7045</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Service installed</td><td style="padding:8px;border-top:1px solid rgba(148,163,184,0.2);">Persistence via malicious service</td></tr>' +
'</table>' +
m3svg1 +
'<h3>Sysmon — The Analyst\'s Best Friend</h3>' +
'<p>Windows Event Logging by default is thin. <strong>Sysmon</strong> (System Monitor, from Microsoft Sysinternals) fills the gaps: process creation with command line, network connections with process context, file creation, registry modifications, driver loading. It writes to <code>Microsoft-Windows-Sysmon/Operational</code>.</p>' +
'<p>Sysmon Event IDs you\'ll use daily:</p>' +
'<ul>' +
'<li><strong>1 — Process Create:</strong> Image, command line, parent image, user, hash.</li>' +
'<li><strong>3 — Network Connect:</strong> Source process + destination IP + port.</li>' +
'<li><strong>11 — File Create:</strong> Detects dropped payloads.</li>' +
'<li><strong>13 — Registry Value Set:</strong> Persistence via Run keys, services.</li>' +
'<li><strong>22 — DNS Query:</strong> Detects DNS-based C2.</li>' +
'<li><strong>8 — CreateRemoteThread:</strong> Process injection.</li>' +
'</ul>' +
m3svg2 +
'<h3>Linux Logs</h3>' +
'<p>On Linux, logs live in <code>/var/log/</code>:</p>' +
'<ul>' +
'<li><strong>/var/log/auth.log</strong> (Debian) or <strong>/var/log/secure</strong> (RHEL) — SSH logins, sudo usage, authentication events.</li>' +
'<li><strong>/var/log/syslog</strong> or <strong>/var/log/messages</strong> — General system events.</li>' +
'<li><strong>/var/log/audit/audit.log</strong> — If auditd is running, this is a goldmine: process execution, file access, syscalls.</li>' +
'<li><strong>/var/log/kern.log</strong> — Kernel messages, often shows firewall drops.</li>' +
'<li><strong>~/.bash_history</strong> — User shell history; attackers sometimes forget to clear it.</li>' +
'<li><strong>journalctl</strong> — systemd\'s central log, queryable with <code>journalctl -u sshd</code> etc.</li>' +
'</ul>' +
'<h3>Real-World Scenario: PowerShell Attack Chain</h3>' +
'<p>You see this in Sysmon Event ID 1:</p>' +
'<pre style="background:rgba(0,0,0,0.4);padding:12px;border-radius:8px;overflow-x:auto;"><code>Image: C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe\n' +
'CommandLine: powershell.exe -nop -w hidden -enc SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0AC...</code></pre>' +
'<p>Decode: <code>-nop</code> = no profile, <code>-w hidden</code> = hidden window, <code>-enc</code> = Base64-encoded command. That is <em>never</em> legitimate. The parent process matters too — if it\'s <code>winword.exe</code> or <code>outlook.exe</code>, you\'ve got a phishing payload executing. Isolate, preserve memory, escalate.</p>' +
'<h3>Real-World Scenario: SSH Brute Force</h3>' +
'<p>In <code>/var/log/auth.log</code> on a Linux server:</p>' +
'<pre style="background:rgba(0,0,0,0.4);padding:12px;border-radius:8px;overflow-x:auto;"><code>Oct  7 03:14:22 srv1 sshd[28193]: Failed password for invalid user admin from 45.142.212.61 port 51234\n' +
'Oct  7 03:14:23 srv1 sshd[28194]: Failed password for invalid user root from 45.142.212.61 port 51235\n' +
'Oct  7 03:14:24 srv1 sshd[28195]: Failed password for invalid user test from 45.142.212.61 port 51236</code></pre>' +
'<p>Same source IP, rapid fire, common usernames. Classic credential brute force. Block the IP, check if any login succeeded, and if so treat the host as compromised.</p>' +
'<h3>Key Terms</h3>' +
'<ul>' +
'<li><strong>EVTX</strong> — Windows Event Log file format.</li>' +
'<li><strong>Sysmon</strong> — Sysinternals tool extending Windows logging with process, network, and file events.</li>' +
'<li><strong>Event ID</strong> — Numeric identifier of an event type in Windows logs.</li>' +
'<li><strong>auditd</strong> — Linux audit daemon; logs syscalls, file access, process execution.</li>' +
'<li><strong>journalctl</strong> — systemd log query utility on Linux.</li>' +
'<li><strong>Process Tree</strong> — Parent/child relationship of processes; critical for detecting suspicious execution chains.</li>' +
'<li><strong>LOLBin</strong> — Living-Off-the-Land Binary; a legitimate Windows tool abused for malicious purposes (powershell.exe, certutil.exe, mshta.exe).</li>' +
'<li><strong>Persistence</strong> — Mechanisms attackers use to survive reboots (Run keys, scheduled tasks, services).</li>' +
'<li><strong>Base64 Encoding</strong> — Encoding scheme often used to obfuscate PowerShell commands.</li>' +
'<li><strong>Centralized Logging</strong> — Shipping logs to a central server (SIEM) so local log deletion doesn\'t destroy evidence.</li>' +
'</ul>';

// ================== 25 QUIZ Qs PER MODULE ==================

const q1 = [
  { text: 'Which pillar of the CIA triad protects against unauthorized data disclosure?', options: ['Confidentiality', 'Integrity', 'Availability', 'Non-repudiation'], correct: 0, difficulty: 'easy' },
  { text: 'What is the primary role of a Blue Team?', options: ['Detect and respond to attacks', 'Launch attacks', 'Audit financial records', 'Configure routers'], correct: 0, difficulty: 'easy' },
  { text: 'Which SOC tier is typically entry-level?', options: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'], correct: 0, difficulty: 'easy' },
  { text: 'Which is a defensible use of MITRE ATT&CK?', options: ['Mapping alerts to adversary techniques', 'Replacing antivirus', 'Firewall configuration', 'Encrypting disks'], correct: 0, difficulty: 'medium' },
  { text: 'Which activity characterizes Purple Teaming?', options: ['Red and Blue share TTPs to improve detection', 'Two red teams compete', 'Only defensive work', 'Only offensive work'], correct: 0, difficulty: 'medium' },
  { text: 'A ransomware attack that encrypts a file server primarily violates:', options: ['Availability', 'Confidentiality', 'Integrity', 'Authentication'], correct: 0, difficulty: 'medium' },
  { text: 'What does MTTR measure in a SOC?', options: ['Mean Time To Respond', 'Maximum Threat Triage Rate', 'Managed Threat Ratio', 'Mean Transfer Time Ratio'], correct: 0, difficulty: 'medium' },
  { text: 'The Target 2013 breach is often cited because:', options: ['Alerts fired but were not escalated', 'No tools were deployed', 'Attackers used zero-days only', 'The SOC was outsourced'], correct: 0, difficulty: 'hard' },
  { text: 'A Tier 1 analyst should escalate when:', options: ['Multiple correlated signals suggest compromise', 'An alert matches a known false positive', 'The user has admin rights', 'The alert is scheduled maintenance'], correct: 0, difficulty: 'medium' },
  { text: 'Which is NOT a typical SOC metric?', options: ['Gross Profit Margin', 'MTTD', 'MTTR', 'Alert Volume'], correct: 0, difficulty: 'easy' },
  { text: 'An analyst notices 47 failed logins followed by a success at 3 AM from a Tor exit node. The best next step is:', options: ['Escalate immediately with a timeline', 'Wait for more alerts', 'Close as a false positive', 'Email the user'], correct: 0, difficulty: 'hard' },
  { text: 'Which framework describes attacker behavior as a linear chain from recon to actions on objectives?', options: ['Cyber Kill Chain', 'OSI Model', 'NIST CSF', 'CIA Triad'], correct: 0, difficulty: 'medium' },
  { text: 'In the CIA triad, hashing primarily protects:', options: ['Integrity', 'Confidentiality', 'Availability', 'Anonymity'], correct: 0, difficulty: 'medium' },
  { text: 'Which best describes alert fatigue?', options: ['Analysts ignore alerts due to false positives', 'The SIEM is down', 'Alerts are too slow', 'The network is congested'], correct: 0, difficulty: 'easy' },
  { text: 'Tier 3 analysts typically focus on:', options: ['Proactive threat hunting and deep forensics', 'Closing Tier 1 tickets', 'Running password resets', 'Buying tools'], correct: 0, difficulty: 'medium' },
  { text: 'A DDoS attack most directly violates:', options: ['Availability', 'Confidentiality', 'Integrity', 'Non-repudiation'], correct: 0, difficulty: 'easy' },
  { text: 'Which certification is most aligned with SOC analyst roles?', options: ['CompTIA CySA+', 'CCNA', 'PMP', 'CISSP'], correct: 0, difficulty: 'medium' },
  { text: 'What does an IOC represent?', options: ['Evidence of a potential compromise', 'A compliance requirement', 'A network protocol', 'A firewall rule'], correct: 0, difficulty: 'easy' },
  { text: 'The primary purpose of a SOC is:', options: ['24/7 detection and response to threats', 'Auditing code', 'Managing HR', 'Building applications'], correct: 0, difficulty: 'easy' },
  { text: 'An attacker exfiltrates a customer database. Which CIA pillar is primarily affected?', options: ['Confidentiality', 'Availability', 'Integrity', 'Authentication'], correct: 0, difficulty: 'medium' },
  { text: 'Which best describes the Blue Team mindset?', options: ['Assume breach; verify everything', 'Trust internal traffic', 'Ignore low-severity alerts', 'Prioritize speed over accuracy'], correct: 0, difficulty: 'medium' },
  { text: 'Which is a common challenge for entry-level SOC analysts?', options: ['High volume of false-positive alerts', 'Lack of internet access', 'Too many tools', 'Short shifts'], correct: 0, difficulty: 'easy' },
  { text: 'If a security tool alerts but the team does nothing, the failure is:', options: ['Process, not tooling', 'Always hardware', 'The vendor\'s fault', 'Random chance'], correct: 0, difficulty: 'hard' },
  { text: 'A key indicator of a targeted attack vs opportunistic is:', options: ['Multiple stages of activity on the same asset', 'One random port scan', 'A phishing email to one user', 'A single failed login'], correct: 0, difficulty: 'hard' },
  { text: 'Which team role is best described as "adversarial collaboration"?', options: ['Purple Team', 'Red Team only', 'Blue Team only', 'GRC'], correct: 0, difficulty: 'medium' }
];

const q2 = [
  { text: 'Which layer of OSI handles IP addresses?', options: ['Layer 3 — Network', 'Layer 2 — Data Link', 'Layer 4 — Transport', 'Layer 7 — Application'], correct: 0, difficulty: 'easy' },
  { text: 'The TCP three-way handshake consists of:', options: ['SYN, SYN-ACK, ACK', 'SYN, ACK, FIN', 'ACK, SYN, FIN', 'SYN, RST, ACK'], correct: 0, difficulty: 'easy' },
  { text: 'A TCP SYN scan (nmap -sS) is characterized by:', options: ['SYN then RST without completing handshake', 'Full three-way handshake', 'UDP probes only', 'ICMP echo'], correct: 0, difficulty: 'medium' },
  { text: 'DNS most commonly uses which port?', options: ['53', '22', '443', '445'], correct: 0, difficulty: 'easy' },
  { text: 'Beaconing traffic is best identified by:', options: ['Regular intervals and consistent payload size', 'Large bursts', 'Unusual ports only', 'Encrypted only'], correct: 0, difficulty: 'medium' },
  { text: 'Which protocol is connectionless?', options: ['UDP', 'TCP', 'SCTP', 'TLS'], correct: 0, difficulty: 'easy' },
  { text: 'SMB (used for file sharing on Windows) runs on port:', options: ['445', '53', '3389', '22'], correct: 0, difficulty: 'medium' },
  { text: 'DNS tunneling is used by attackers to:', options: ['Smuggle data via DNS queries', 'Encrypt C2 traffic', 'Scan ports', 'Spoof MAC addresses'], correct: 0, difficulty: 'medium' },
  { text: 'Which tool is standard for packet capture analysis?', options: ['Wireshark', 'Nmap', 'Metasploit', 'Hashcat'], correct: 0, difficulty: 'easy' },
  { text: 'The "five-tuple" refers to:', options: ['Src IP, src port, dst IP, dst port, protocol', 'MAC, IP, port, hostname, domain', 'User, host, time, action, result', 'SYN, ACK, FIN, RST, PSH'], correct: 0, difficulty: 'medium' },
  { text: 'RDP (used for remote desktop on Windows) runs on port:', options: ['3389', '22', '23', '8080'], correct: 0, difficulty: 'easy' },
  { text: 'An analyst wants to view only SMB traffic in Wireshark. The filter is:', options: ['tcp.port == 445', 'udp.port == 53', 'ip.addr == x', 'icmp'], correct: 0, difficulty: 'medium' },
  { text: 'A SYN flood exploits which characteristic of TCP?', options: ['State table exhaustion from half-open connections', 'Weak encryption', 'DNS resolution', 'Port forwarding'], correct: 0, difficulty: 'hard' },
  { text: 'Which is the best way to read a full HTTP conversation in Wireshark?', options: ['Right-click a packet → Follow → TCP Stream', 'Use display filter http', 'Statistics menu', 'Capture options'], correct: 0, difficulty: 'medium' },
  { text: 'WinRM uses which ports?', options: ['5985/5986', '445/139', '22/23', '80/443'], correct: 0, difficulty: 'hard' },
  { text: 'East-West traffic refers to:', options: ['Internal-to-internal traffic', 'External-to-internal', 'Internet-only traffic', 'VPN-only traffic'], correct: 0, difficulty: 'medium' },
  { text: 'DNS DGA (Domain Generation Algorithm) is used by malware to:', options: ['Generate many domains for C2 fallback', 'Compress payloads', 'Encrypt files', 'Spoof MACs'], correct: 0, difficulty: 'hard' },
  { text: 'Which protocol is used by attackers for covert channels because firewalls often allow it out?', options: ['DNS', 'SMB', 'RDP', 'SNMP'], correct: 0, difficulty: 'medium' },
  { text: 'NetFlow provides:', options: ['Metadata about network flows', 'Packet payloads', 'Encryption keys', 'DNS records'], correct: 0, difficulty: 'medium' },
  { text: 'Which is a sign of exfiltration over HTTPS?', options: ['Large outbound uploads to unusual destinations', 'Short DNS queries', 'ICMP pings', 'ARP broadcasts'], correct: 0, difficulty: 'medium' },
  { text: 'A normal TCP connection closes with:', options: ['FIN / ACK', 'SYN / ACK', 'RST only', 'PSH / URG'], correct: 0, difficulty: 'medium' },
  { text: 'HTTPS traffic on port 443 is best analyzed by:', options: ['TLS metadata and certificates (unless decrypted)', 'Reading plaintext directly', 'DNS logs', 'ICMP captures'], correct: 0, difficulty: 'hard' },
  { text: 'Beaconing intervals that are constant (e.g., exactly 60s) suggest:', options: ['Automated C2, not human interaction', 'A legitimate update', 'Random internet noise', 'DNS resolver caching'], correct: 0, difficulty: 'hard' },
  { text: 'Port 22 is best associated with:', options: ['SSH', 'Telnet', 'FTP', 'SMTP'], correct: 0, difficulty: 'easy' },
  { text: 'An analyst sees 2,000 DNS queries in 1 hour from one host to subdomains of a single domain with random strings. Best interpretation:', options: ['Likely DNS tunneling / exfiltration', 'Normal browsing', 'DHCP renewal', 'Print spooler'], correct: 0, difficulty: 'hard' }
];

const q3 = [
  { text: 'Where are Windows Event Logs stored?', options: ['C:\\Windows\\System32\\winevt\\Logs', 'C:\\Logs\\', '/var/log', 'C:\\Temp'], correct: 0, difficulty: 'easy' },
  { text: 'Which Windows Event ID corresponds to a successful logon?', options: ['4624', '4625', '4688', '4720'], correct: 0, difficulty: 'medium' },
  { text: 'Which Windows Event ID corresponds to process creation?', options: ['4688', '4624', '4625', '7045'], correct: 0, difficulty: 'medium' },
  { text: 'Which event ID indicates a new service was installed (persistence)?', options: ['7045', '4624', '4625', '4720'], correct: 0, difficulty: 'medium' },
  { text: 'Sysmon extends Windows logging to include:', options: ['Process creation, network connections, file creation, registry changes', 'Only logon events', 'Only network events', 'Only file events'], correct: 0, difficulty: 'medium' },
  { text: 'Sysmon Event ID 3 corresponds to:', options: ['Network connection', 'Process create', 'File create', 'DNS query'], correct: 0, difficulty: 'hard' },
  { text: 'Sysmon Event ID 22 corresponds to:', options: ['DNS query', 'Network connect', 'Process create', 'Registry set'], correct: 0, difficulty: 'hard' },
  { text: 'Linux authentication logs are typically found in:', options: ['/var/log/auth.log or /var/log/secure', '/etc/passwd', '/tmp/logs', '/home/user/logs'], correct: 0, difficulty: 'medium' },
  { text: 'The auditd daemon on Linux logs:', options: ['Syscalls, file access, and process execution', 'Only SSH logins', 'Only kernel panics', 'Only firewall events'], correct: 0, difficulty: 'medium' },
  { text: 'PowerShell with -nop -w hidden -enc is best interpreted as:', options: ['Suspicious — hidden, obfuscated execution', 'Normal admin activity', 'Windows Update', 'An installation script'], correct: 0, difficulty: 'hard' },
  { text: 'A LOLBin is:', options: ['A legitimate OS tool abused for malicious purposes', 'A Linux shell', 'A type of malware', 'A firewall appliance'], correct: 0, difficulty: 'medium' },
  { text: 'Which LOLBin is often used to download files?', options: ['certutil.exe', 'notepad.exe', 'solitaire.exe', 'calc.exe'], correct: 0, difficulty: 'medium' },
  { text: 'Event ID 4720 indicates:', options: ['A user account was created', 'A file was deleted', 'A logon succeeded', 'A service stopped'], correct: 0, difficulty: 'medium' },
  { text: 'Event ID 4728/4732 indicates:', options: ['User added to a privileged group', 'Successful logon', 'Process creation', 'Service installed'], correct: 0, difficulty: 'hard' },
  { text: 'Command to query systemd logs for sshd on Linux:', options: ['journalctl -u sshd', 'cat /etc/ssh', 'ls -la /var', 'netstat -a'], correct: 0, difficulty: 'medium' },
  { text: '~/.bash_history is useful because:', options: ['It records commands run by the user', 'It stores passwords', 'It logs kernel events', 'It contains DNS records'], correct: 0, difficulty: 'medium' },
  { text: 'A process tree matters because:', options: ['It reveals parent-child relationships, exposing suspicious chains', 'It shows disk usage', 'It reveals passwords', 'It maps ports'], correct: 0, difficulty: 'medium' },
  { text: 'If PowerShell is spawned by winword.exe, this strongly suggests:', options: ['A phishing document executing a payload', 'Normal Word behavior', 'A Windows update', 'A print job'], correct: 0, difficulty: 'hard' },
  { text: 'Base64 encoding in PowerShell -enc is often used to:', options: ['Obfuscate commands from casual inspection', 'Speed up execution', 'Encrypt output files', 'Load device drivers'], correct: 0, difficulty: 'medium' },
  { text: 'Sysmon Event ID 1 records:', options: ['Process creation with command line and parent', 'Network connection', 'DNS query', 'File deletion'], correct: 0, difficulty: 'medium' },
  { text: 'Which is the primary reason to ship logs to a central server?', options: ['Preserve evidence even if the host is compromised', 'Reduce disk usage', 'Comply with cloud billing', 'Speed up boot'], correct: 0, difficulty: 'medium' },
  { text: 'Failed SSH logins in auth.log from the same IP in rapid succession indicate:', options: ['Brute force attempt', 'Normal backup', 'DNS renewal', 'A printer job'], correct: 0, difficulty: 'easy' },
  { text: 'Which file is best for auditing syscall-level activity on Linux?', options: ['/var/log/audit/audit.log', '/var/log/syslog', '~/.bash_history', '/etc/hosts'], correct: 0, difficulty: 'hard' },
  { text: 'An attacker\'s most likely persistence mechanism on Windows includes:', options: ['Scheduled tasks, Run keys, malicious services', 'Only passwords', 'Only antivirus', 'Only browser cookies'], correct: 0, difficulty: 'medium' },
  { text: 'In Windows, which log most reliably contains privileged-use events?', options: ['Security.evtx', 'System.evtx', 'Application.evtx', 'Setup.evtx'], correct: 0, difficulty: 'medium' }
];

// ================== WRITE ==================

(async () => {
  try {
    await m.connect(process.env.MONGODB_URI, { dbName: 'oblixel_academy' });
    console.log('Connected\n');

    const Courses = m.connection.collection('courses');
    const Questions = m.connection.collection('examquestions');

    const course = await Courses.findOne({ courseId: 'oca' });
    if (!course) { console.error('OCA not found'); process.exit(1); }

    // --- Videos for M1, M2, M3 ---
    const vids1 = [
      { title: 'What is a SOC? Security Operations Center Explained', youtubeId: 'hWM8M7cS3-c', channel: 'IBM Technology' },
      { title: 'Blue Team vs Red Team', youtubeId: 'Ca5Sf1R0J_k', channel: 'Simply Cyber' },
      { title: 'CIA Triad Explained', youtubeId: 'bW4NNJmZfPA', channel: 'Professor Messer' },
      { title: 'Day in the Life of a SOC Analyst', youtubeId: 'qw2P9xWnK1k', channel: 'Gerald Auger' },
      { title: 'MITRE ATT&CK Framework Overview', youtubeId: '0SoT1BxTVo8', channel: 'MITRE' },
      { title: 'Cybersecurity Career Paths', youtubeId: 'inWWhr5tnEA', channel: 'NetworkChuck' }
    ];

    const vids2 = [
      { title: 'TCP/IP Model Explained', youtubeId: 'PJe7K5R6JgY', channel: 'Professor Messer' },
      { title: 'Wireshark Tutorial for Beginners', youtubeId: 'lbL4P1CkGmU', channel: 'Chris Greer' },
      { title: 'OSI Model Explained', youtubeId: 'Wo2ddDVK-S0', channel: 'Practical Networking' },
      { title: 'DNS Explained', youtubeId: '72snZctFFtA', channel: 'PowerCert' },
      { title: 'TCP Three-Way Handshake Explained', youtubeId: 'wExC-GB0KNo', channel: 'Chris Greer' },
      { title: 'Network Analysis for Security', youtubeId: 'f0d2gH0UQNo', channel: 'Chris Greer' }
    ];

    const vids3 = [
      { title: 'Windows Event Logs Explained', youtubeId: 'VnPfWs6Fb5c', channel: '13Cubed' },
      { title: 'Sysmon Installation and Config', youtubeId: 'W6g0GdP7lFQ', channel: '13Cubed' },
      { title: 'Windows Event ID Reference for Analysts', youtubeId: '0B75H0eYmRs', channel: 'SANS Digital Forensics' },
      { title: 'Linux Logs for Incident Response', youtubeId: '5xLhPf5M7Ng', channel: 'John Hammond' },
      { title: 'Auditd Configuration Deep Dive', youtubeId: '7sZ6v_VfCkU', channel: 'SANS Digital Forensics' },
      { title: 'Detecting PowerShell Attacks', youtubeId: 'fHT9aQt3RnY', channel: 'SANS Digital Forensics' }
    ];

    // --- Update modules 1-3 ---
    const modules = course.modules.slice();
    const lessons = [lesson1, lesson2, lesson3];
    const vids = [vids1, vids2, vids3];
    const inlineQuiz = [q1.slice(0, 10), q2.slice(0, 10), q3.slice(0, 10)];

    [1, 2, 3].forEach((modId, i) => {
      const idx = modules.findIndex(x => x.moduleId === modId);
      if (idx === -1) { console.log('WARN: M' + modId + ' not found'); return; }
      modules[idx].lessonContent = lessons[i];
      modules[idx].videos = vids[i];
      modules[idx].quiz = inlineQuiz[i];
      console.log('M' + modId + ' content: ' + lessons[i].length + ' chars, ' +
        vids[i].length + ' videos, ' + inlineQuiz[i].length + ' inline Qs');
    });

    await Courses.updateOne(
      { _id: course._id },
      { $set: { modules, updatedAt: new Date() } }
    );

    // --- Insert 25 questions per module into examquestions ---
    const allQs = [q1, q2, q3];
    for (let i = 0; i < 3; i++) {
      const mid = i + 1;
      const existing = await Questions.countDocuments({ courseId: 'oca', moduleId: mid });
      const docs = allQs[i].map(q => ({
        courseId: 'oca',
        moduleId: mid,
        text: q.text,
        options: q.options,
        correct: q.correct,
        difficulty: q.difficulty,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      await Questions.insertMany(docs);
      const total = await Questions.countDocuments({ courseId: 'oca', moduleId: mid });
      console.log('M' + mid + ' questions: ' + existing + ' -> ' + total);
    }

    console.log('\nBatch 1 complete.');
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
