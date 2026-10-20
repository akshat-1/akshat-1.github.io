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
                'Deployed Renovate Bot for Bitbucket repositories using an orchestrator UI, Artifactory, and TeamCity.',
                'Created a Python Maven dependency-tree parser using backtracking and integrated OSV and NVD data for CVE IDs, severity, fixed versions, and patched versions.',
                'Received a Pre-Placement Offer for delivering scalable automation that streamlined enterprise dependency vulnerability management.'
            ],
            tags: ['GitHub Actions', 'Python', 'OSV / NVD', 'Renovate', 'TeamCity'],
            detail: {
                eyebrow: 'Professional experience · case file 01',
                title: 'Dependency remediation, designed as a system.',
                intro: 'At Deutsche India, I worked in the TDI division on automation for identifying, prioritising, validating, and promoting dependency upgrades across enterprise repositories.',
                context: [
                    { period: 'Weeks 1–2 · Induction', text: 'I completed the induction programme and set up the development environment for the TDI division, getting familiar with the repositories, build systems, and security workflow.' },
                    { period: 'Week 3 · Dependency intelligence', text: 'I wrote Python tooling to parse Maven dependency trees using backtracking. The parser connected package information to OSV and NVD data and produced a comprehensive view of CVE IDs, severity, fixed versions, and patched versions.' },
                    { period: 'Weeks 4–5 · Renovate and Bitbucket', text: 'I explored Renovate Bot and built an orchestrator UI around Bitbucket repositories. It triggered scans, parsed the reported vulnerabilities, and scored every fixed version using severity, version distance, and compatibility so the least severe, closest viable fix could be selected.' },
                    { period: 'Weeks 4–5 · TeamCity validation', text: 'The remediation flow used TeamCity as the CI/CD gate. The highest-scoring fixed version was applied one dependency at a time; successful changes were retained, failed upgrades were reverted to the last working checkpoint, and only a sequence of successful builds was promoted for pull-request creation.' },
                    { period: 'Weeks 6–7 · Scan and triage agents', text: 'I developed a GitHub Actions workflow that used Dependabot to scan repositories on push events and scheduled cron jobs. The Triage agent sorted vulnerabilities by CVE and fix score, keeping the remediation order explicit and repeatable.' },
                    { period: 'Weeks 6–7 · Remediation and validation agents', text: 'The Remediation agent selected the highest-scoring fixed version and changed one dependency at a time in package-manager files such as pom.xml and package.json. The Validation agent built after each change, kept successful updates, reverted failures to the last successful checkpoint, and then returned to remediation for the next dependency.' },
                    { period: 'Final handoff · Promotion', text: 'The complete pipeline guaranteed that only successful builds were promoted as pull requests. Iterating through the dependency list with a build check at every step made the final Bitbucket pull request safer and reproducible.' }
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
                'Used Gophish to simulate large-scale phishing through Gmail and SMS, then studied credential-harvesting and multi-factor authentication bypass risks with Evilginx in controlled environments.',
                'Developed and evaluated sandboxed payload demonstrations with Metasploit for initial access and privilege escalation, testing browser, email, SMS, and social-platform security controls.',
                'Explored social engineering as a complementary delivery vector and documented weaknesses for defensive analysis.'
            ],
            tags: ['Gophish', 'Evilginx', 'Metasploit', 'Security R&D'],
            detail: {
                eyebrow: 'Professional experience · case file 02',
                title: 'Studying the human edge of a security boundary.',
                intro: 'Under Prof. N. S. Narayanaswamy, I worked on malware engineering and mitigation strategies through controlled security research and sandboxed demonstrations.',
                context: [
                    { period: 'Weeks 1–3 · Attack research', text: 'I reviewed the latest CVEs to understand how new cyber attacks work, then used Gophish to simulate large-scale phishing through Gmail and SMS. I also studied the native security controls used by companies and explored Evilginx as a man-in-the-middle technique for understanding how two-factor authentication can be bypassed.' },
                    { period: 'Weeks 4–6 · Payload research', text: 'I developed payloads with Metasploit for initial access and privilege escalation, then tested different delivery methods against the native protections provided by internet browsers, Gmail, SMS, and social-media platforms. The demonstrations exposed weaknesses in the systems under test.' },
                    { period: 'Weeks 7–8 · Social engineering', text: 'I explored social engineering as another route for phishing and payload delivery, documenting critical vulnerabilities observed in everyday social-media platforms and connecting the technical findings back to defensive analysis.' }
                ],
                workstreams: ['CVE and attack-chain research', 'Controlled phishing simulation', 'Credential and MFA risk analysis', 'Sandboxed payload demonstrations', 'Social-engineering threat modelling'],
                certificate: './certificates/iit-cybersecurity-internship.pdf',
                certificateLabel: 'IIT Madras cybersecurity internship certificate · view only'
            }
        }
    ],
    current: {
        label: 'Current dual-degree project',
        title: 'Marine Diffusion Planner for autonomous vessel driving.',
        copy: 'Currently, I am working on a Marine Diffusion Planner as my Dual Degree Project: a DiT-based architecture for live, real-world autonomous driving of marine vessels. This research project aims to replace the current state-of-the-art model-free reinforcement-learning-based planner, which learns the dynamics of the environment using discrete Markov chains, while external planners and controllers are placed on top of the learned environment for autonomous driving.',
        detail: 'My research aims to understand the critical flaws of reinforcement-learning-based planners. Instead of using separate discrete models for planning and environment modelling, my work brings them together in a single architecture using a diffusion model. This approach addresses critical flaws in reinforcement-learning-based planners, such as the accumulation of error and the lack of a real connection and flow of weights between the environmental model and the planner. My work uses real ship AIS data to train imitation-learning-based diffusion models with approximately 80M parameters. The model predicts the next few seconds of a vessel’s path from the current environmental context. The decoder, a DiT, is then fine-tuned with reinforcement learning using a hybrid loss that implements rewards necessary for avoiding collisions and maintaining a safe distance according to ocean-governance rules, as well as rewards for keeping the ship upright, delayed response, and special cases such as head-on encounters.',
        focus: ['Marine Diffusion Planner', 'DiT-based architecture', 'Model-free RL planner replacement', 'AIS-data imitation learning · ~80M parameters', 'Hybrid loss for safe vessel behaviour']
    },
    projects: [
        {
            number: '01',
            title: 'Latent Diffusion Model',
            type: 'Generative AI · from scratch',
            result: 'Prompt-conditioned image generation',
            description: 'Built an LDM in PyTorch with a UNet noise predictor, VAE latent representation, CLIP text alignment, and cross-attention for controlled generation.',
            tags: ['PyTorch', 'UNet', 'VAE', 'CLIP', 'Hugging Face'],
            scene: 'diffusion',
            link: 'https://github.com/akshat-1/Latent-Diffusion-PyTorch'
        },
        {
            number: '02',
            title: 'Card Detection CNN',
            type: 'Computer vision · live inference',
            result: 'Live rank-and-suit detection',
            description: 'Designed a four-layer CNN with batch normalization and OpenCV camera input; used augmentation, L2 regularization, and dropout to improve generalization.',
            tags: ['CNN', 'OpenCV', 'BatchNorm', 'Regularization'],
            scene: 'cnn',
            link: 'https://github.com/akshat-1/Card_classification_CNN'
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
        { code: 'MA2040', title: 'Probability, Statistics and Stochastic Process' },
        { code: 'OE2023', title: 'Marine Instrumentation Lab' },
        { code: 'OB2202', title: 'Programming, Data Structures and Algorithms using Python' },
        { code: 'OB3214', title: 'Deep Learning for Computer Vision' },
        { code: 'ID6040', title: 'Introduction to Robotics' },
        { code: 'OE3035', title: 'Motion of Ships & Floating Systems' },
        { code: 'OE3036', title: 'Manoeuvring and Control of Marine Vehicles' },
        { code: 'OE5011', title: 'Marine Robotics' },
        { code: 'EE6180', title: 'Advanced Topics in Artificial Intelligence' },
        { code: 'CS6847', title: 'Cloud Computing' },
        { code: 'EE6347', title: 'Devices and Technologies for AI and Neuromorphic Computing' },
        { code: 'ED6007', title: 'Mechanics of Robots' },
        { code: 'ED5215', title: 'Introduction to Motion Planning' },
        { code: 'EE6412', title: 'Optimal Control' },
        { code: 'ID5201', title: 'Robotics Seminar' }
    ],
    awards: [
        'Achiever’s Award for securing second position in Class XII.',
        'Highest Overall Distinction in Class X for best overall performance.'
    ]
};
