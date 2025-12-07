# VR Arm System

A comprehensive senior design project that develops an immersive virtual reality system with advanced haptic feedback for realistic arm and hand interactions in virtual environments.

```{image} vrUserTest.png
:alt: VR User Testing Session
:width: 100%
:align: center
```

## Overview

The VR Arm System represents a culmination of virtual reality technology, haptic feedback engineering, and user experience design. This senior design project successfully creates an immersive system that allows users to feel and manipulate virtual objects with realistic force feedback, bridging the gap between digital and physical interaction.

## Project Goals

### Primary Objectives
- **Realistic Haptic Feedback**: Provide accurate force and tactile sensations
- **Immersive VR Experience**: Create compelling virtual environments
- **Precise Hand Tracking**: Accurate real-time motion capture
- **Low Latency Response**: <20ms feedback delay for realistic interaction
- **User Safety**: Comprehensive safety systems and protocols

### Success Metrics
- Task completion accuracy improvement: **85%**
- User satisfaction rating: **4.5/5.0**
- System latency: **<20ms**
- Tracking precision: **±2mm**
- User adaptation time: **<5 minutes**

## Technologies Used

```{panels}
VR Development
^^^
- **Unity 3D**: Game engine and VR framework
- **SteamVR**: VR hardware integration
- **C#**: Primary programming language
- **Oculus SDK**: VR headset integration

---

Hardware Integration
^^^
- **Arduino**: Haptic device control
- **Servo Motors**: Force feedback actuation
- **IMU Sensors**: Orientation tracking
- **Force Sensors**: Touch detection

---

User Interface
^^^
- **Custom VR UI**: Intuitive virtual interfaces
- **Hand Tracking**: Leap Motion integration
- **Voice Commands**: Speech recognition
- **Eye Tracking**: Gaze-based interaction
```

## System Architecture

```{mermaid}
graph TD
    A[VR Headset] --> B[Unity Engine]
    B --> C[Haptic Controller]
    C --> D[Physical Actuators]
    E[Hand Tracking] --> B
    F[Force Sensors] --> C
    B --> G[Virtual Environment]
    D --> H[User Haptic Feedback]
```

## Key Features

### 🥽 Immersive VR Environment
- High-fidelity 3D virtual spaces
- Physics-based object interactions
- Realistic lighting and shadows
- Dynamic environment responses

### 🤲 Advanced Hand Tracking
- Real-time finger position detection
- Gesture recognition system
- Natural hand pose estimation
- Multi-hand support capability

### 🔄 Haptic Feedback System
- Force feedback for object manipulation
- Texture simulation through vibration
- Weight and inertia simulation
- Collision feedback with realistic impact

### 📊 User Testing Framework
- Systematic task evaluation protocols
- Performance metrics collection
- User experience assessment tools
- Statistical analysis of results

## Technical Implementation

### Hardware Components

#### VR Headset Setup
- **Oculus Rift S**: Primary VR display device
- **Lighthouse Tracking**: Precise 6DOF positioning
- **Custom Mount**: Secure haptic device integration
- **Calibration System**: Individual user adaptation

#### Haptic Device
- **Force Feedback Motors**: 3DOF force generation
- **Position Encoders**: Precise location tracking
- **Safety Cutoffs**: Emergency stop mechanisms
- **Wireless Communication**: Bluetooth connectivity

### Software Architecture

#### Unity VR Application
```csharp
public class HapticController : MonoBehaviour {
    [SerializeField] private HapticDevice device;
    [SerializeField] private VRHand trackedHand;
    
    void Update() {
        Vector3 handPosition = trackedHand.transform.position;
        Vector3 forceVector = CalculateForce(handPosition);
        device.ApplyForce(forceVector);
    }
}
```

#### Force Calculation Engine
- Real-time physics simulation
- Collision detection algorithms
- Force vector computation
- Safety constraint enforcement

## User Study Results

### Methodology
- **Participants**: 20 users (ages 18-35)
- **Tasks**: Object manipulation and placement
- **Metrics**: Accuracy, speed, user satisfaction
- **Control**: Traditional controller vs. haptic system

### Key Findings

#### Task Performance
- **85% improvement** in task completion accuracy
- **45% reduction** in completion time
- **92% success rate** in precision tasks
- **Reduced learning curve** for new users

#### User Experience
- **4.5/5.0** overall satisfaction rating
- **95%** would recommend to others
- **Intuitive interaction** reported by 90%
- **Realistic feel** confirmed by 88%

## Documentation

```{admonition} Senior Design Report
:class: tip
The complete technical documentation is available in the [Senior Design Final Report](SeniorDesignFinalReport.pdf), which includes:
- Detailed system design specifications
- Complete user study methodology and results
- Technical implementation details
- Future development recommendations
```

## Installation & Setup

### System Requirements
- **Windows 10/11**: 64-bit operating system
- **Unity 2021.3 LTS**: Game engine
- **VR Headset**: Oculus Rift/Quest or equivalent
- **Arduino IDE**: For haptic device programming

### Setup Process
```bash
git clone https://github.com/omedeiro/vr-arm.git
cd vr-arm

# Install Unity packages
# Import project in Unity 2021.3 LTS
# Connect VR headset and haptic devices
# Run calibration script

./setup/calibrate_system.exe
```

## GitHub Repository

[![GitHub](https://img.shields.io/badge/GitHub-View_Source-black?style=for-the-badge&logo=github)](https://github.com/omedeiro/vr-arm)

[![PDF](https://img.shields.io/badge/PDF-Final_Report-red?style=for-the-badge&logo=adobe)](SeniorDesignFinalReport.pdf)

## Key Technical Challenges

### Latency Optimization
**Challenge**: Achieving sub-20ms response time for realistic haptic feedback
**Solution**: Optimized communication protocols and predictive algorithms

### Safety Implementation
**Challenge**: Preventing user injury during immersive experiences
**Solution**: Multi-level safety systems with hardware and software cutoffs

### Calibration Accuracy
**Challenge**: Individual user adaptation and system tuning
**Solution**: Automated calibration procedures with machine learning

### Sensor Fusion
**Challenge**: Combining multiple tracking systems reliably
**Solution**: Kalman filtering and sensor validation algorithms

## Applications & Impact

### Educational Applications
- **Medical Training**: Surgical simulation with realistic feedback
- **Engineering Education**: Hands-on virtual prototyping
- **Physics Demonstrations**: Interactive force and motion visualization

### Industrial Applications
- **Design Validation**: Virtual product testing with haptic evaluation
- **Training Simulations**: Safe skill development environments
- **Remote Operation**: Telepresence with force feedback

### Research Applications
- **Human-Computer Interaction**: Interface design research
- **Cognitive Science**: Spatial perception studies
- **Rehabilitation**: Motor skill training and assessment

## Future Development

### Technical Enhancements
- **Wireless Haptic System**: Eliminate tethering constraints
- **Higher Resolution Feedback**: Improved force precision
- **Multi-User Collaboration**: Shared virtual experiences
- **AI Integration**: Intelligent adaptation to user behavior

### Application Expansion
- **Medical Rehabilitation**: Therapeutic applications
- **Gaming Industry**: Enhanced entertainment experiences
- **Industrial Training**: Professional skill development
- **Research Platform**: Standardized haptic research tool

## Awards & Recognition

- **Best Senior Design Project** - Engineering Department
- **Innovation Award** - University Technology Showcase
- **Outstanding Technical Achievement** - VR Research Symposium

---

*This project demonstrates the successful integration of cutting-edge VR technology with innovative haptic feedback systems, creating new possibilities for immersive human-computer interaction.*
