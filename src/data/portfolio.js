export const portfolio = {
    profile: {
        name: 'Akshat Porwal',
        shortName: 'AP',
        role: 'AI · Robotics · Computer Vision · Systems',
        college: 'Indian Institute of Technology Madras',
        degree: 'B.Tech. · Ocean Engineering & IDDD Robotics',
        graduation: 'Expected 2027',
        cgpa: '8.34 / 10',
        email: 'mpakshat@gmail.com',
        academicEmail: 'na22b025@smail.iitm.ac.in',
        github: 'https://github.com/akshat-1',
        linkedin: 'https://www.linkedin.com/in/akshat-porwal-iitm/',
        photo: './assets/profile-photo.png',
        instituteLogo: './assets/iitm-logo.png'
    },
    education: [
        { period: '2022 — 2027', title: 'B.Tech. in Ocean Engineering & IDDD Robotics', org: 'Indian Institute of Technology Madras', detail: 'CGPA 8.34 · NA22B025' },
        { period: '2022', title: 'Class XII', org: 'M.P. Board', detail: '86% · Achiever’s Award · second among 200+ students' },
        { period: '2020', title: 'Class X', org: 'C.B.S.E.', detail: '83.8% · Highest Overall Distinction among 120+ students' }
    ],
    achievements: [
        'JEE Advanced: top 0.9% among 1.1 million participants',
        'JEE Mains 2022: top 0.4 percentile among 900,000 candidates',
        'Competitive programming and problem-solving through regular contest participation'
    ],
    experience: [
        {
            slug: 'deutsche-bank',
            period: 'May 18, 2026 — Jul 10, 2026',
            company: 'Deutsche Bank',
            role: 'Analyst Intern · Professional Experience',
            accent: '01',
            summary: 'Built scalable dependency-vulnerability remediation systems that turn security findings into validated pull requests.',
            bullets: [
                'Developed a GitHub Actions pipeline with Scan, Triage, Remediation, and Validation agents.',
                'Automated dependency updates, CI build checks, rollback of failed upgrades, and PR generation.',
                'Deployed Renovate Bot for Bitbucket repositories using Artifactory and TeamCity.',
                'Created a Python Maven dependency-tree parser using backtracking and integrated OSV and NVD data for CVEs, severity, fixed versions, and patched versions.',
                'Received a Pre-Placement Offer for delivering scalable automation that streamlined enterprise dependency vulnerability management.'
            ],
            tags: ['GitHub Actions', 'Python', 'OSV / NVD', 'Renovate', 'TeamCity'],
            detail: {
                eyebrow: 'Professional experience · case file 01',
                title: 'Dependency remediation, designed as a system.',
                intro: 'At Deutsche India, I worked in the TDI division on automation for identifying, prioritising, validating, and promoting dependency upgrades across enterprise repositories.',
                context: [
                    'The work started with an induction and environment setup, followed by a focused investigation into how dependency trees expose direct and transitive vulnerabilities. I built Python tooling to parse Maven dependency trees and connect package information with OSV and NVD data.',
                    'I then explored Renovate Bot and built orchestration around Bitbucket repositories. Candidate fixes were scored by severity, closeness to a fixed version, and practical compatibility before being applied one dependency at a time.',
                    'The validation loop used TeamCity to build after each change. Successful changes were retained, failed upgrades were reverted to the last working checkpoint, and only buildable sequences were promoted for pull-request creation.',
                    'In parallel, I developed a GitHub Actions workflow organised as Scan, Triage, Remediation, and Validation agents. This made the process repeatable for push events and scheduled scans while keeping the promotion gate tied to a successful build.'
                ],
                workstreams: ['Maven dependency-tree parsing', 'OSV / NVD vulnerability intelligence', 'Renovate and Bitbucket orchestration', 'TeamCity build validation', 'GitHub Actions remediation agents'],
                certificate: './certificates/deutsche-bank-internship.pdf',
                certificateLabel: 'Deutsche India internship certificate · view only'
            }
        },
        {
            slug: 'iit-cybersecurity',
            period: 'May 01, 2024 — Jul 31, 2024',
            company: 'IIT Madras',
            role: 'Cybersecurity R&D Intern · Prof. N. S. Narayanaswamy',
            accent: '02',
            summary: 'Explored phishing and initial-access techniques in controlled sandbox environments.',
            bullets: [
                'Studied recent CVEs and phishing techniques to understand how modern attack chains exploit human and technical trust boundaries.',
                'Used Gophish and Evilginx in controlled environments to study phishing, credential-harvesting, and multi-factor authentication bypass risks.',
                'Developed and evaluated sandboxed payload demonstrations with Metasploit, focusing on browser, email, SMS, and social-platform security controls.',
                'Explored social engineering as a complementary delivery vector and documented weaknesses for defensive analysis.'
            ],
            tags: ['Gophish', 'Evilginx', 'Metasploit', 'Security R&D'],
            detail: {
                eyebrow: 'Professional experience · case file 02',
                title: 'Studying the human edge of a security boundary.',
                intro: 'Under Prof. N. S. Narayanaswamy, I worked on malware engineering and mitigation strategies through controlled security research and sandboxed demonstrations.',
                context: [
                    'The research began with a review of recent vulnerabilities and the mechanics behind emerging attack campaigns. The goal was to understand how technical weaknesses and social manipulation combine in real-world phishing flows.',
                    'I used Gophish to model controlled phishing scenarios and Evilginx to study the risks around credential interception and multi-factor authentication. All demonstrations were performed in isolated research environments.',
                    'The later phase explored payload delivery and privilege-escalation demonstrations with Metasploit, testing how browser, email, SMS, and social-media controls respond to different delivery patterns.',
                    'The work concluded with a study of social engineering as a delivery mechanism and documentation of the defensive gaps observed during the experiments.'
                ],
                workstreams: ['CVE and attack-chain research', 'Controlled phishing simulation', 'Credential and MFA risk analysis', 'Sandboxed payload demonstrations', 'Social-engineering threat modelling'],
                certificate: './certificates/iit-cybersecurity-internship.pdf',
                certificateLabel: 'IIT Madras cybersecurity internship certificate · view only'
            }
        }
    ],
    current: {
        label: 'Current dual-degree project',
        title: 'A diffusion planner for the open water.',
        copy: 'I am building a Marine Diffusion Planner: a DiT-based architecture for real-world autonomous vessel driving that brings environment modelling and planning into one learnable flow.',
        detail: 'The project uses real ship AIS data to train an imitation-learning diffusion model of roughly 80M parameters. Its decoder is then fine-tuned with reinforcement learning through a hybrid objective covering collision avoidance, safe distance, vessel uprightness, delayed response, and head-on encounters.',
        focus: ['Marine Diffusion Planner', 'AIS-data imitation learning', 'Diffusion Transformer · ~80M parameters', 'Hybrid reinforcement-learning loss', 'Collision-aware vessel planning']
    },
    projects: [
        {
            number: '01',
            title: 'Latent Diffusion Model',
            type: 'Generative AI · from scratch',
            result: 'Prompt-conditioned image generation',
            description: 'Built an LDM in PyTorch with a UNet noise predictor, VAE latent representation, CLIP text alignment, and cross-attention for controlled generation.',
            tags: ['PyTorch', 'UNet', 'VAE', 'CLIP', 'Hugging Face'],
            scene: 'diffusion'
        },
        {
            number: '02',
            title: 'Card Detection CNN',
            type: 'Computer vision · live inference',
            result: 'Live rank-and-suit detection',
            description: 'Designed a four-layer CNN with batch normalization and OpenCV camera input; used augmentation, L2 regularization, and dropout to improve generalization.',
            tags: ['CNN', 'OpenCV', 'BatchNorm', 'Regularization'],
            scene: 'cnn'
        },
        {
            number: '03',
            title: 'Autonomous Vessel PID',
            type: 'Marine robotics · ROS2',
            result: 'Real-time position tracking',
            description: 'Implemented a PID closed-loop controller with UWB sensing, vessel maneuvering equations, and mass/inertial matrices for stable motion prediction.',
            tags: ['ROS2', 'PID', 'UWB', 'Optimal control'],
            scene: 'vessel'
        },
        {
            number: '04',
            title: 'Ace Bot',
            type: 'Robotic manipulation · vision',
            result: 'Automated card gameplay',
            description: 'Engineered a CNN-guided robotic manipulator with forward and inverse kinematics through Jacobian inversion, while optimizing structural weight distribution.',
            tags: ['Manipulation', 'CNN', 'Kinematics', 'Jacobian'],
            scene: 'robot'
        }
    ],
    leadership: [
        { period: 'Apr 2025 — Apr 2026', title: 'Envisage Core · Shaastra, CFI', metric: 'CORE', detail: 'Led a multidisciplinary team across Tech Ambience, Shows, GameDev, and XR; represented a large student-run technical festival organising body.' },
        { period: 'Mar 2024 — Mar 2025', title: 'Envisage Manager', metric: 'MGR', detail: 'Managed members across project execution, logistics, robotic manipulators, inverse kinematics, and CNN development.' },
        { period: 'Jul 2023 — Mar 2024', title: 'Envisage Coordinator', metric: 'COORD', detail: 'Coordinated Swift Canvas, a 2D pen-plotter project showcased at CFI Open House, Research Conclave, and Shaastra.' }
    ],
    skills: {
        'AI / ML': ['PyTorch', 'NumPy', 'Pandas', 'Hugging Face', 'Gymnasium', 'MediaPipe', 'OpenCV', 'Scikit-learn'],
        'Languages': ['Python', 'C', 'C++', 'Bash', 'Shell', 'Node.js', 'MATLAB', 'SQL'],
        'Robotics': ['ROS2', 'Arduino', 'Motion planning', 'Marine robotics', 'Optimal control', 'Computer vision'],
        'Platform': ['Git', 'GitHub', 'Docker', 'GitHub Actions', 'Helm', 'Kubernetes', 'Linux', 'Flask'],
        'Tools': ['Fusion 360', 'Unity', 'Jupyter', 'Colab', 'Kaggle', 'Bitbucket', 'Artifactory', 'TeamCity']
    },
    coursework: [
        { code: 'CS1100', title: 'Introduction to Programming' },
        { code: 'AM1100', title: 'Engineering Mechanics' },
        { code: 'MA1101', title: 'Functions of Several Variables' },
        { code: 'OE1101', title: 'Introduction to Naval Architecture & Ocean Engineering' },
        { code: 'OE1012', title: 'Ship Hydrostatics and Stability' },
        { code: 'EE1100', title: 'Basic Electrical Engineering' },
        { code: 'OE2023', title: 'Marine Instrumentation Lab' },
        { code: 'MA2040', title: 'Probability, Statistics and Stochastic Process' },
        { code: 'OE2013', title: 'Ship Drawing and Calculations' },
        { code: 'OE2044', title: 'Ship Hydrodynamics' },
        { code: 'AM2200', title: 'Strength of Materials' },
        { code: 'OE2024', title: 'Analysis of Structures' },
        { code: 'MA2010', title: 'Complex Variables' },
        { code: 'OE2014', title: 'Marine Engineering' },
        { code: 'OE2054', title: 'Ocean Wave Hydrodynamics' },
        { code: 'OE2034', title: 'Ship Resistance and Propulsion' },
        { code: 'OB2202', title: 'Programming, Data Structures and Algorithms using Python' },
        { code: 'OE3035', title: 'Motion of Ships & Floating Systems' },
        { code: 'OE3016', title: 'Ship Design' },
        { code: 'OE3015', title: 'Ship Structural Analysis' },
        { code: 'OE3045', title: 'Vibration of Marine Structures' },
        { code: 'OB3214', title: 'Deep Learning for Computer Vision' },
        { code: 'ID6040', title: 'Introduction to Robotics' },
        { code: 'OE3036', title: 'Manoeuvring and Control of Marine Vehicles' },
        { code: 'OE5011', title: 'Marine Robotics' },
        { code: 'OE3046', title: 'Ship Structural Design' },
        { code: 'EE6180', title: 'Advanced Topics in Artificial Intelligence' },
        { code: 'CS6847', title: 'Cloud Computing' },
        { code: 'OE3190', title: 'Design of Ocean Structures' },
        { code: 'EE6347', title: 'Devices and Technologies for AI and Neuromorphic Computing' },
        { code: 'ED6007', title: 'Mechanics of Robots' },
        { code: 'ED5215', title: 'Introduction to Motion Planning' },
        { code: 'OE5340', title: 'Ocean Environment Policy & Coastal Zone Management' },
        { code: 'EE6412', title: 'Optimal Control' },
        { code: 'ID5201', title: 'Robotics Seminar' }
    ],
    awards: [
        'Achiever’s Award for securing second position in Class XII.',
        'Highest Overall Distinction in Class X for best overall performance.'
    ]
};
