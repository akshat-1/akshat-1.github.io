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
        photo: './assets/profile-placeholder.svg'
    },
    metrics: [
        { value: '40%', label: 'manual remediation effort reduced' },
        { value: '91%', label: 'custom CNN accuracy' },
        { value: '1391', label: 'peak Codeforces rating' },
        { value: '9.3k+', label: 'visitors engaged at showcases' }
    ],
    education: [
        { period: '2022 — 2027', title: 'B.Tech. in Ocean Engineering & IDDD Robotics', org: 'Indian Institute of Technology Madras', detail: 'CGPA 8.34 · NA22B025' },
        { period: '2022', title: 'Class XII', org: 'M.P. Board', detail: '86% · Achiever’s Award · second among 200+ students' },
        { period: '2020', title: 'Class X', org: 'C.B.S.E.', detail: '83.8% · Highest Overall Distinction among 120+ students' }
    ],
    achievements: [
        'JEE Advanced: top 0.9% among 1.1 million participants',
        'JEE Mains 2022: top 0.4 percentile among 900,000 candidates',
        'Maximum Codeforces rating of 1391'
    ],
    experience: [
        {
            period: 'May 2026 — Jul 2026',
            company: 'Deutsche Bank',
            role: 'Analyst Intern · Professional Experience',
            accent: '01',
            summary: 'Built scalable dependency-vulnerability remediation systems that turn security findings into validated pull requests.',
            bullets: [
                'Developed a GitHub Actions pipeline with Scan, Triage, Remediation, and Validation agents.',
                'Automated dependency updates, CI build checks, rollback of failed upgrades, and PR generation.',
                'Deployed Renovate Bot for Bitbucket repositories using Artifactory and TeamCity.',
                'Created a Python Maven dependency-tree parser integrated with OSV and NVD for CVEs, severity, and fixed versions.',
                'Received a Pre-Placement Offer after reducing manual remediation effort by 40%.'
            ],
            tags: ['GitHub Actions', 'Python', 'OSV / NVD', 'Renovate', 'TeamCity']
        },
        {
            period: 'May 2024 — Aug 2024',
            company: 'IIT Madras',
            role: 'Cybersecurity R&D Intern · Prof. N. S. Narayanaswamy',
            accent: '02',
            summary: 'Explored phishing and initial-access techniques in controlled sandbox environments.',
            bullets: [
                'Simulated real-world phishing scenarios and credential-harvesting flows using Gophish and Evilginx.',
                'Developed proof-of-concept payloads to demonstrate initial-access techniques on sandbox systems.'
            ],
            tags: ['Gophish', 'Evilginx', 'Security R&D', 'Sandboxing']
        }
    ],
    current: {
        label: 'What I am exploring now',
        title: 'Making intelligent systems feel tangible.',
        copy: 'I am working at the intersection of learning systems and physical systems: translating perception into motion, and turning complex infrastructure signals into reliable automated decisions.',
        focus: ['Embodied AI', 'Computer vision', 'Autonomous robotics', 'Security automation', 'Cloud-native tooling']
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
            result: '91% custom-model accuracy',
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
        { period: 'Apr 2025 — Apr 2026', title: 'Envisage Core · Shaastra, CFI', metric: '70+', detail: 'Led a multidisciplinary team across Tech Ambience, Shows, GameDev, and XR; represented a 1,000+ member organizing body.' },
        { period: 'Mar 2024 — Mar 2025', title: 'Envisage Manager', metric: '20+', detail: 'Managed members across project execution, logistics, robotics manipulators, inverse kinematics, and CNN development.' },
        { period: 'Jul 2023 — Mar 2024', title: 'Envisage Coordinator', metric: '9,300+', detail: 'Coordinated Swift Canvas, a 2D pen-plotter project showcased at CFI Open House, Research Conclave, and Shaastra.' }
    ],
    skills: {
        'AI / ML': ['PyTorch', 'NumPy', 'Pandas', 'Hugging Face', 'Gymnasium', 'MediaPipe', 'OpenCV', 'Scikit-learn'],
        'Languages': ['Python', 'C', 'C++', 'Bash', 'Shell', 'Node.js', 'MATLAB', 'SQL'],
        'Robotics': ['ROS2', 'Arduino', 'Motion planning', 'Marine robotics', 'Optimal control', 'Computer vision'],
        'Platform': ['Git', 'GitHub', 'Docker', 'GitHub Actions', 'Helm', 'Kubernetes', 'Linux', 'Flask'],
        'Tools': ['Fusion 360', 'Unity', 'Jupyter', 'Colab', 'Kaggle', 'Bitbucket', 'Artifactory', 'TeamCity']
    },
    coursework: ['Deep Learning for Computer Vision', 'Introduction to Robotics', 'Data Structures & Algorithms', 'Motion Planning', 'AI & Neuromorphic Computing', 'Advanced AI', 'Cloud Computing', 'Marine Robotics', 'Optimal Control'],
    awards: [
        'Achiever’s Award for securing second position in Class XII.',
        'Highest Overall Distinction in Class X for best overall performance.'
    ]
};
