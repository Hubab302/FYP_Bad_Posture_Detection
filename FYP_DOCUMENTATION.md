# AI-Based Personal Posture and Ergonomics Coach

> **Readable extraction of the approved FYP documentation.**
> The source wording and requirements are preserved. Formatting is normalized only so a coding agent can read the document reliably.
> Important diagrams, tables, sequence diagrams, architecture drawings, class/domain models, and interface mockups are preserved as rendered images in `docs/images/`.

## Document identity

- **Submitted To:** Dr. Syed Muhammad Naqi
- **Submitted By:** Hubab Masood Chaudhary
- **Department:** Department of Computer Science
- **Institution:** Quaid I Azam University Islamabad

## Agent usage note

For implementation, treat this file as the readable academic source of truth. Use `MASTER_SPECIFICATION.md` as the technical implementation specification. Where a visual diagram or interface layout matters, inspect the image linked under that source page.

---

## Source Page 1

AI-based Personal Posture and Ergonomics
Coach




Submitted To: Dr. Syed Muhammad Naqi

Submitted By: Hubab Masood Chaudhary

Department of Computer Science
Quaid I Azam University Islamabad

---

## Source Page 2

ACKNOWLEDGEMENT
All praise and gratitude are due to Allah Almighty, whose countless blessings, guidance, and
strength have enabled me to complete this work successfully. Without His mercy, nothing would
have been possible. I would like to extend my sincere appreciation to Dr. Syed Muhammad Naqi
for his invaluable support, encouragement, and insightful guidance throughout this journey. His
expertise and mentorship have been instrumental in shaping my understanding and approach. I
am deeply grateful to my family for their unwavering love, patience, and constant motivation. Their
support has been the foundation of my perseverance and success. Special thanks to our
departmental Head, Dr. Ayaz Hussain, for providing a conducive learning environment and
valuable insights that helped me throughout this process.

I am immensely thankful to Ma'am Onaiza for teaching us Software Construction, providing us
with essential knowledge that proved crucial in this journey. I also wish to express my gratitude to
my esteemed teachers—Sir Rabi, Sir Mudassir, Sir Akmal Khattak, Sir Muazzam Khattak, Ma'am
Memoona, Sir Ali Naqi, and Sir Ghazanfar—for their dedication and commitment to teaching us
programming, enabling us to achieve this milestone.

I acknowledge everyone who has contributed, directly or indirectly, to this achievement. Your
support has been truly invaluable.

---

## Source Page 3

ABSTRACT
In today's world, prolonged computer usage has increased significantly among office workers,
remote employees, and students who are required to sit in front of screens for extended hours on
a daily basis. Continuous sitting in improper posture such as slouching, forward head position, or
leaning leads to physical discomfort including neck pain, shoulder pain, upper and lower back
discomfort, and muscle fatigue which ultimately reduces work efficiency and productivity. Most
individuals remain unaware of their bad sitting habits until physical symptoms begin to appear.
Existing posture correction solutions either require specialized hardware or wearable devices
which are expensive and inconvenient for everyday use. Despite the growing need for accessible
posture monitoring, there is a lack of simple, non-intrusive, and real-time solutions that work
without any additional equipment.
AI-Based Personal Posture and Ergonomics Coach is a web application that helps users monitor
and correct their sitting posture in real time using only a laptop's built-in webcam. It continuously
captures the user's posture, detects key skeleton points using AI, and classifies posture as good
or bad. When a user maintains bad posture beyond a predefined threshold of 60 seconds, the
system generates a real-time alert and provides ergonomic recommendations to correct it
immediately. The system also maintains a detailed posture log and generates weekly reports
showing total monitoring duration, bad posture percentage, most frequent bad posture type, and
overall session statistics so users can track their improvement over time. A posture history view
allows users to review their past seven days of data. The solution requires no special hardware or
wearable device, making it suitable and accessible for everyday use by students, office workers,
and remote employees.
Looking ahead, the system aims to expand its capabilities by incorporating predictive posture
analysis, personalized ergonomic coaching plans, and multi-platform support. With continuous
development, the AI-Based Personal Posture and Ergonomics Coach envision becoming an
essential productivity tool that promotes healthier work habits and reduces the long-term
physical impact of prolonged computer usage.

---

## Source Page 4

Table of Contents
Chapter 1: Software Project Management Plan------------------------------------------- 6
 1.1 Introduction--------------------------------------------------------------------------- 7
 1.2 Problem Statement------------------------------------------------------------------- 7
 1.3 Project Description------------------------------------------------------------------- 7
 1.4 Major Functionalities----------------------------------------------------------------- 7
 1.5 Objectives----------------------------------------------------------------------------- 8
 1.6 Tools and Technique------------------------------------------------------------------ 8
 1.7 Users----------------------------------------------------------------------------------- 8
 1.8 Software Process Model-------------------------------------------------------------- 8
 1.9 Project Plan Management------------------------------------------------------------ 9
 1.10 Requirement Analysis Phase------------------------------------------------------- 9
 1.11 Designing Phase--------------------------------------------------------------------- 11
 1.12 Implementation Phase-------------------------------------------------------------- 14
 1.13 Gantt Chart---------------------------------------------------------------------------15
Chapter 2: Software Requirement Specification--------------------------------------------16
 2.1 Introduction----------------------------------------------------------------------------17
 2.2 Functional Requirements-------------------------------------------------------------17
 2.3 Non-Functional Requirements-------------------------------------------------------17
 2.4 Constraints-----------------------------------------------------------------------------17
 2.5 Major Input and Output----------------------------------------------------------------17
 2.6 UseCase Diagram----------------------------------------------------------------------18
 2.7 UseCase Description------------------------------------------------------------------19
 2.7.1 SignUp------------------------------------------------------------------------------19
 2.7.2 Login--------------------------------------------------------------------------------19
 2.7.3 Track Posture-----------------------------------------------------------------------20
 2.7.4 Generate Posture Report----------------------------------------------------------21
 2.7.5 View Posture History---------------------------------------------------------------21
 2.7.6 Logout-------------------------------------------------------------------------------22
 2.8 System Sequence Diagram-------------------------------------------------------------23
 2.8.1 SignUp-------------------------------------------------------------------------------23
 2.8.2 Login---------------------------------------------------------------------------------23
 2.8.3 Track Posture------------------------------------------------------------------------24
 2.8.4 Generate Posture Report-----------------------------------------------------------24
 2.8.5 View Posture History---------------------------------------------------------------25
 2.8.6 Logout--------------------------------------------------------------------------------25
 2.9 Domain Model---------------------------------------------------------------------------26

---

## Source Page 5

2.10 Entity Relationship Diagram(ERD)-----------------------------------------------------27
Chapter 3: Software Design Description---------------------------------------------------------28
 3.1 Introduction-------------------------------------------------------------------------------- 29
 3.2 Architectural Diagram--------------------------------------------------------------------- 29
 3.3 Sequence Diagrams----------------------------------------------------------------------- 30
 3.3.1 SignUp-------------------------------------------------------------------------------- 30
 3.3.2 Login---------------------------------------------------------------------------------- 31
 3.3.3 Track Posture-------------------------------------------------------------------------32
 3.3.4 Generate Posture Report----------------------------------------------------------- 33
 3.3.5 View Posture History---------------------------------------------------------------- 34
 3.3.6 Logout-------------------------------------------------------------------------------- 35
 3.4 Class Diagram-----------------------------------------------------------------------------36
 3.5 Interfaces Design--------------------------------------------------------------------------37
Chapter 4: Software Testing--------------------------------------------------------------------- -41
 4.1 Introduction-------------------------------------------------------------------------------42
 4.2 Test Cases---------------------------------------------------------------------------------42
 4.2.1 SignUp---------------------------------------------------------------------------------42
 4.2.2 Login-----------------------------------------------------------------------------------42
 4.2.3 Track Posture-------------------------------------------------------------------------43
 4.2.4 Generate Posture Report------------------------------------------------------------43
 4.2.5 View Posture History-----------------------------------------------------------------44
 4.2.6 Logout---------------------------------------------------------------------------------44
Reference ------------------------------------------------------------------------------------------45

---

## Source Page 6

CHAPTER NUMBER 1
SOFTWARE PROJECT MANAGEMENT PLAN

---

## Source Page 7

Chapter 1: Software Project Management Plan

1.1 Introduction:
This first chapter introduces the description of “AI-based Personal Posture and Ergonomic Coach”
what is the problem statement, and how it will be designed and developed to solve the particular
problem. This chapter will also explain the scope, requirements and objectives of the project.

1.2 Problem Statement:
Today the use of computers has increased a lot in the lives of office workers, remote
employees and students. As a result, individuals are required to sit in front of it for a long
time. Continuous sitting in improper posture such as slouching, forward head or leaning
can lead to physical discomfort and reduced work efficiency. Most Individuals are unaware
of their bad posture sitting until they start feeling physical discomfort such as neck pain,
shoulder pain, upper back discomfort, lower back discomfort, muscle fatigue.
Existing bad posture solutions may require either specialized hardware or wearable device.
these approaches can be expensive or inconvenient for everyday use.
Therefore, there is a need for simple, non-intrusive and real-time posture monitoring
system. So, the proposed “AI-Based Personal Posture & Ergonomics Coach” system will
monitor user’s posture in real time and give recommendations for ergonomic improvement.

1.3 Project Description:
The proposed “AI-Based Personal Posture & Ergonomics Coach” is a web application,
which observes user’s posture continuously through laptop’s webcam, detect key skeleton
points and classify posture as good or bad. When user maintains bad posture for a duration
which exceeds predefined threshold time (60 seconds), system generates an alert in real
time and suggests ergonomic improvement accordingly.
The system also maintains a log, and based on these statistics, weekly reports can be
generated which helps user understand his bad posture over time and make improvements
to reduce physical discomfort and increase productivity. This solution is simple, non-intrusive and does not require any special hardware or wearable device. Which makes it
suitable for everyday use.

1.4 Major Functionalities:
 1. Signup user
 2. Login User

---

## Source Page 8

3. Track posture
 4. generate report(weekly)
 5. View posture History(weekly)
 6. Logout

1.5 Objectives:
Here are the main Objectives:
 1. To help users to maintain ergonomic posture without requiring special hardware or
wearable device.
 2. To increase work productivity by reducing physical discomfort caused by prolonged
poor sitting posture.
 3. To promote healthy sitting posture while working on computer.
 4. To address the posture-related issues that are becoming increasingly common among
students, office workers, and remote employees.

1.6 Tools and techniques:
It is web-based application and following tools has been used in development
 1. React
 2. Nodejs
 3. Express
 4. Mongodb
 5. MS word

1.7 Users:
 1. Office workers: who works on computer for hours
 2. remote employees or freelancers: who work from home using laptops
 3. students: who study long hours on laptop

1.8 Software Process Model:
Waterfall Model will be used in the project because:
 1. It has clear Requirements

---

## Source Page 9

1.9 Project Management Plan:
This section will elaborate on how the task will be divided among different people and resources.
What will be the deliverables, risks and constraints?
1.10 Requirements Analysis Phase:
1.10.1 Requirement Identification:
 Table 1.1 Requirements Identification Task


1.10.2 Define Use Cases:
 Table 1.2 Defining Use Cases Task




Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
The initial step of this
project is the
identification of
requirements which are
functional and
nonfunctional.
Requirements are
collected and
reviewed
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS Word

Hardware:
Laptop
None
None
Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
After clearing all
requirements software
architecture will start
with Use case diagrams
Use Cases are
written and then
should be
submitted as a
Use-Case
Diagram in Word
format
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS Word, draw.io

Hardware:
Laptop
Requirements
must be clear.
Unclear
requirements

### Visual reference — source page 9

![Source page 9: requirements analysis tables](docs/images/page-09-requirements-analysis-tables.png)

---

## Source Page 10

1.10.3 Develop Domain Model:
 Table 1.3 Domain Model Development Task




1.10.4 ERD Designing:
 Table 1.4 ERD Designing Task




Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
After we know about the
use cases of a project,
we will start designing
Domain Models for the
system
Domain model
will be reviewed
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS Word, draw.io

Hardware:
Laptop
We must know
the use cases
before we move
to the Domain
Model
ill-defined
use cases
Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
In this step, we make
ERD Designs for the
database
ERD Design will
be reviewed
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS Word, draw.io

Hardware:
Laptop
We must know
the design of the
domain model so
we can see
dataflow and
what data we will
need in this step
Any error in
a Domain
model

### Visual reference — source page 10

![Source page 10: domain model erd planning tables](docs/images/page-10-domain-model-erd-planning-tables.png)

---

## Source Page 11

1.10.5 SRS Completion:
 Table 1.5 SRS Completion Task




1.11 Designing Phase:
1.11.1 Develop Design:
 Table 1.6 Design Development Task



Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
This task includes making
software requirements
specification document
SRS document in
Word or pdf form

Requirement
analysis
completed
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS Word

Hardware:
Laptop
None
None
Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
Development of
architectural design
Architectural
Diagram in PDF
or Word format
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS Word, draw.io

Hardware:
Laptop
Requirement
analysis must be
completed
Ill-defined
requirements

### Visual reference — source page 11

![Source page 11: srs design planning tables](docs/images/page-11-srs-design-planning-tables.png)

---

## Source Page 12

1.11.2 Develop Interfaces:
 Table 1.7 Interface Development Task




1.11.3 Class Diagram Designing:
 Table 1.8 Class Diagram Task



Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
This task includes how
each screen looks like
and what feature will
come on what screen so
we will make interfaces.
Canva Design, or
Pdf format design
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS word, Canva

Hardware:
Laptop
Architectural
design must be
completed
Ill-defined
requirements,
Use cases
Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
In this step, we create a
Class Diagram to show
the flow of data and how
they relate to each other.
Class Diagram in
PDF or Word
format
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS Word, draw.io

Hardware:
Laptop
Architectural
Design must be
completed
ill-defined
architectural
design, and
domain
model.

### Visual reference — source page 12

![Source page 12: interface class design planning tables](docs/images/page-12-interface-class-design-planning-tables.png)

---

## Source Page 13

1.11.4 Sequence Diagram Designing:
 Table 1.9 Sequence Diagram Task



1.11.5 Design Phase Verification:
 Table 1.10 Design Phase Verification Task


Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
In this step, we make a
Sequence Diagram to
show the flow of data
Sequence
Diagram in PDF
or Word format
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS Word, draw.io

Hardware:
Laptop
Architectural
Design must be
completed
ill-defined
architectural
design, and
domain
model.
Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
In this step, we make
sure that all the steps
completed before the
previous phase are
correct. We do previous
phase verification.
Design phase
is completed
it’s document
will be
reviewed.
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS Word, draw.io

Hardware:
Laptop
The whole Design
phase must be
completed
None

### Visual reference — source page 13

![Source page 13: sequence design verification tables](docs/images/page-13-sequence-design-verification-tables.png)

---

## Source Page 14

1.11.6 Software Test Documentation:
 Table 1.11 Software Test Documentation Task

1.12 Implementation Phase:
1.12.1 System Implementation:
 Table 1.12 System Implementation



Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
In this step, we define the
test cases
Test cases are
reviewed. Design
phase is
complete
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS Word

Hardware:
Laptop
Design phase
should be
complete
None
Task Description
Deliverables
Resources Needed
Dependencies &
Constraints
Risks
In this step, we develop
the web application
Complete web
application
source files
including images,
videos or
anything
embedded in it
submitted in zip.
People:
Hubab Masood
Chaudhary, Dr Syed
Muhammad Naqi

Software:
MS Word, VS Code,
Photoshop, Illustrator,
MySQL, MongoDB

Hardware:
Laptop
The whole Design
phase must be
completed
None

### Visual reference — source page 14

![Source page 14: testing implementation planning tables](docs/images/page-14-testing-implementation-planning-tables.png)

---

## Source Page 15

1.13 Gantt Chart:


 Figure 1 Gantt Chart

### Visual reference — source page 15

![Source page 15: gantt chart](docs/images/page-15-gantt-chart.png)

---

## Source Page 16

CHAPTER NUMBER 2
SOFTWARE REQUIREMENTS SPECIFICATIONS

---

## Source Page 17

2.1 Introduction:
This chapter first describes the attributes of the software system. It highlights the user
characteristics and major constraints of the tool. It also elaborates on the use cases and system
sequence diagrams. Finally, this chapter explains the domain model and database design of the
project.

2.2 Functional Requirements:
 1. Signup: When user opens my desktop app for the first time, he will have to signup by
providing the asked information
 2. Login: Each time already signed up user open my app, he will have to login using
credentials.
 3. Track posture: User will click on track posture and app will start monitoring his posture
in real time.
 4. Generate Posture report: Allows the user to see his posture detail weekly
 5. View posture history: Allow the user to view read only posture history for last 7 days.
Functions (not use case)
 6. Generate alert: when duration of bad posture exceeds threshold time(1 min), the
system will generate real time alert to notify the user. If user does not correct posture,
system will repeat an alert after every 2 mins until posture is corrected
 7. Generate ergonomic recommendation: The system will provide recommendations for
ergonomic improvement to correct the posture.
 8. display posture graph: system will generate real time posture graph (simple line graph)
when user clicks on “track posture”.
 9. Backup of the system: After 24 hours, system will automatically take backup of the
data.

2.3 Non-Functional Requirement:
1. Accuracy in Posture Detection
2. Real time Data Storage
3. Real time posture detection and alert generation (also ergonomic suggestion)
2.4 Constraints:
This system is only for laptops.

2.5 Major Input and Output:
Major Inputs:
 1. Signup and login credentials (username, password, email)
 2. Real time posture frames

---

## Source Page 18

Major Outputs:
 1. Alert for bad posture
 2. ergonomic suggestion
 3. real time posture line graph
 4. report and history output(total monitoring duration, total bad posture duration, bad
posture percentage, good posture duration, most frequent bad posture, date, posture type)

2.6 Use Case Diagram:

### Visual reference — source page 18

![Source page 18: use case diagram](docs/images/page-18-use-case-diagram.png)

---

## Source Page 19

2.7 Use Case Text:
2.7.1 Use Case text for “Signup”
ID: UD1
Name: Signup
Primary Actors: User (office workers, remote employees, students)
Pre-condition: None
Post-condition:
 1. User’s account is created successfully
 2. Main dashboard of app is displayed
Main Success scenario:
 1. User requests for sign up
 2. System shows signup page and asks for information
 3. User enters the asked information
 4. System creates user’s account and displays main dashboard of app
Alternative flow:
 3a. User does not provide complete information
 System asks user to complete required information
 User provides missing complete information
____________________________________________________________________________________
2.7.2 Use Case text for “Login”
ID: UD2
Name: Login
Primary Actors: User (office workers, remote employees, students)
Pre-condition: User has already an account
Post-Condition:
 1. User has been logged in
 2. Main dashboard has been displayed
Main Success Scenario:
 1. user requests for login
 2. System shows login page and asks for credentials
 3. User enters asked credentials
 4. System logs in the user and displays main app dashboard.
Alternative flow:
 3a. user enters false credentials

---

## Source Page 20

system displays an error
 User re-enters correct credentials
 3b. User does not provide complete information
 System asks to enter required fields
 User provides missing information
____________________________________________________________________________________
2.7.3 Use case text for “Track Posture”
ID: UC3
Name: Track Posture
Primary Actors: User (office workers, remote employees, students)
pre-conditions:
 1. User is logged in.
 2. Laptop’s webcam is on and working correctly.
post-conditions: User’s good posture is detected, bad posture time has been reset and
monitoring again has been started
Main Success Scenario (Basic Flow):
 1. User requests for “track posture”
 2. The system starts capturing the user’s postures in real time
 3. User sits in bad posture longer than the defined threshold time
 4. The system detects bad posture
 5. The system generates an alert in real time
 6. The system provides ergonomic suggestion to correct the posture in real time
 7. User corrects his posture
Alternate Flow:
 6a. User does not correct his position
 The system repeats an alert after every 2 mins until posture is corrected
Special Requirement:
Alert should be non-disturbing and has no sound. If user is using another app, it should
display on top of app without disturbing user activity
____________________________________________________________________________________

---

## Source Page 21

2.7.4 Use case text for “Generate Posture Report”:
ID: UD4
Name: Generate Posture report
Primary Actors: User (office workers, remote employees, students)
Pre-condition: User is logged in
post-condition: One week posture report is displayed
Main Success Scenario (Basic Flow):
 1. User requests to generate a report
 2. User selects a week (by default current week is selected)
 3. System shows the report for that week
Alternative Flow:
 1a. if user using the application for less than one week
 System shows “Not sufficient data to generate report, kindly wait until one week is
completed”
 2a. If user wants to request for a week beyond current week or before the first available
week.
 The System does not allow to request for it
____________________________________________________________________________________
2.7.5 Use case text for “View Posture History”:
ID: UD5
Name: View Posture history
Primary Actors: user (office workers, remote employees, students)
Pre-condition: User is logged in
post-condition:
 1. Current day history has been displayed
 or
 2. one week history is displayed
Main Success Scenario (Basic Flow):
 1. User requests to view history
 2. System asks for current day or weekly history
 3.
 3.1 User requests for current day history
 3.2 System shows current day history so far
 4.
 4.1 User requests for weekly history
 4.2 User selects week (by default current week is selected)
 4.3 System shows selected week history
Alternative Flow:

---

## Source Page 22

4.2a If user wants to request for a week beyond current week or before the first available
week
 The System does not allow to request for it
___________________________________________________________________________________
2.7.6 Use case text for “Logout”:
ID: UD6
Name: Logout
Primary Actors: user (office workers, remote employees, students)
Pre-condition: User is logged in
post-condition:
 1. User has been logged out.
 2. Login/signup page appears
Main Success Scenario (Basic Flow):
 1. User requests for logout
 2. System asks for confirmation
 3. User navigates to “Yes”.
 4. System logout the user.
Alternative Flow:
 3a. User selects “NO”
 System cancels the logout and remain on same page
 3b. User dismisses the confirmation box
 System cancels the logout and remains on dashboard
 ___________________________________________________________________________________

---

## Source Page 23

2.8 System Sequence Diagrams:
2.8.1 SignUp




2.8.2 Login

### Visual reference — source page 23

![Source page 23: system sequence signup login](docs/images/page-23-system-sequence-signup-login.png)

---

## Source Page 24

2.8.3 Track Posture





2.8.4 Generate Posture Report

### Visual reference — source page 24

![Source page 24: system sequence track report](docs/images/page-24-system-sequence-track-report.png)

---

## Source Page 25

2.8.5 View Posture History




2.8.6 Logout

### Visual reference — source page 25

![Source page 25: system sequence history logout](docs/images/page-25-system-sequence-history-logout.png)

---

## Source Page 26

2.9 Domain Model:

### Visual reference — source page 26

![Source page 26: domain model](docs/images/page-26-domain-model.png)

---

## Source Page 27

2.10 ERD:

### Visual reference — source page 27

![Source page 27: erd](docs/images/page-27-erd.png)

---

## Source Page 28

CHAPTER NUMBER 3
SOFTWARE DESIGN DESCRIPTION

---

## Source Page 29

3.1 Introduction
Software Design Description SDD is a representation of a software design used to communicate
system design information to all stakeholders. It shows how the software system will be
structured to satisfy the requirements.

3.2 Architectural Diagram

### Visual reference — source page 29

![Source page 29: architectural diagram](docs/images/page-29-architectural-diagram.png)

---

## Source Page 30

3.3 Sequence Diagrams:
3.3.1 SignUp

### Visual reference — source page 30

![Source page 30: sequence signup](docs/images/page-30-sequence-signup.png)

---

## Source Page 31

3.3.2 Login

### Visual reference — source page 31

![Source page 31: sequence login](docs/images/page-31-sequence-login.png)

---

## Source Page 32

3.3.3 Track Posture

### Visual reference — source page 32

![Source page 32: sequence track posture](docs/images/page-32-sequence-track-posture.png)

---

## Source Page 33

3.3.4 Generate Posture Report

### Visual reference — source page 33

![Source page 33: sequence generate report](docs/images/page-33-sequence-generate-report.png)

---

## Source Page 34

3.3.5 View Posture History

### Visual reference — source page 34

![Source page 34: sequence view history](docs/images/page-34-sequence-view-history.png)

---

## Source Page 35

3.3.6 Logout

### Visual reference — source page 35

![Source page 35: sequence logout](docs/images/page-35-sequence-logout.png)

---

## Source Page 36

3.4 Class Diagram:

### Visual reference — source page 36

![Source page 36: class diagram](docs/images/page-36-class-diagram.png)

---

## Source Page 37

Interface Designs:

________________________________________________________

### Visual reference — source page 37

![Source page 37: interface signup](docs/images/page-37-interface-signup.png)

---

## Source Page 38

________________________________________________________

### Visual reference — source page 38

![Source page 38: interface login dashboard](docs/images/page-38-interface-login-dashboard.png)

---

## Source Page 39

________________________________________________________

### Visual reference — source page 39

![Source page 39: interface tracking report](docs/images/page-39-interface-tracking-report.png)

---

## Source Page 40

________________________________________________________

### Visual reference — source page 40

![Source page 40: interface history](docs/images/page-40-interface-history.png)

---

## Source Page 41

CHAPTER NUMBER 4
SOFTWARE TESTING

---

## Source Page 42

4.1 Introduction
Software test document is a type of document under which test will determine whether system
under test satisfies requirements or work correctly. Developing test cases can also help find
problems in the requirement or design of an application.

4.2 Test Cases

4.2.1 Signup
ID: TC1
Name: Signup
Description: This testcase verifies that user creates an account successfully
Setup:
1. Network is stable
2. Website is opened
Instruction:
1. Click on “Signup”
2. Enter Email hubabmasood47@gmail.com
3. Enter password “Testing”
4. Click on “Creates an account”
Expected Result: main dashboard appears
Actual Result: Dashboard appears
Verdict : Pass
____________________________________________________________________________________
4.2.2 Login
ID: TC2
Name: Login
Description: This testcase verifies that user is logged in into his account successfully
Setup:
1. Network is stable
2. Account already exists
Instructions:
1. Click on “Login”
2. Enter Email as testing123@gmail.com
3. Enter password “hubtest”
4. Click on “Login” button
Expected Result: main dashboard appears
Actual result: Dashboard appears

---

## Source Page 43

Verdict: pass
____________________________________________________________________________________
4.2.3 Track Posture
ID: TC3
Name: Track posture
Description: This testcase checks that system detect the bad posture and generate alert
and suggestion after threshold time of 1 min
Setup:
1. User sits Infront of laptop
2. Webcam is on and correctly working
3. User is logged in into the system
Instructions:
1. Click on “Track posture”
2. 3Sit in bad posture for one min
3. Expected Result: System shows alert and give suggestion to correct his posture
4. Actual result: alert and suggestion is being displayed
Verdict: pass
____________________________________________________________________________________
4.2.4 Generate Posture Report
ID: TC4
Name: Generate Posture Report
Description: This test case verifies that the system generates a weekly posture report
successfully
Setup:
1. Network is stable
2. User is logged in into the system
3. User has used the application for at least one week
Instructions:
1. Click on "Generate Report"
2. Select a week from the available options Click on "Generate"
Expected Result: Weekly posture report is displayed showing total monitoring duration,
total bad posture duration, bad posture percentage, and most frequent bad posture Actual
Result: Weekly report is displayed successfully
Verdict: Pass
____________________________________________________________________________________

---

## Source Page 44

4.2.5 View Posture History
ID: TC5
Name: View History
Description: This test case verifies that the system displays posture history correctly for
current day and weekly view
Setup:
1. Network is stable
2. User is logged in into the system
3. User has at least one recorded posture session(for current Day)
or
4. User has at least on week recorded Posture session
Instructions:
1. Click on "View History"
2. System asks for current day or weekly history Select "Current Day"
Expected Result: Current day posture history is displayed showing good posture duration
and bad posture duration
Result: History is displayed successfully
Verdict: Pass
____________________________________________________________________________________
4.2.6 Logout
ID: TC6
Name: Logout
Description: This test case verifies that the user is logged out successfully after confirmation
Setup:
1. Network is stable
2. User is logged in into the system
Instructions:
1. Click on "Logout"
2. System shows confirmation dialog Click on "Yes"
Expected Result: User is logged out and login/signup page appears Actual
Result: User logged out and login/signup page is displayed
Verdict: Pass

---

## Source Page 45

Reference:
1. https://dspmuranchi.ac.in/pdf/Blog/srs_template-ieee.pdf

---
