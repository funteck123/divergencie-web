# System Blueprint

Legend:

- `+` public, `-` private (not specified in source, left as `+` placeholder)
- `▷` inheritance (extends)
- `◇→` aggregation (holds reference to)
- `◆→` composition (owns / contains)
- `┄▷` interface realization

---

## 1. Base Class

```
User
+ UserID
+ Credential
+ UserType
```

```
Credential
+ UserID
+ Username
+ Password
```

---

## 2. User Subclasses

```
InterviewAcc ▷ User
+ UserID
+ Name
+ InterviewList
+ ScheduleList
+ GetInterviewList()
+ GetScheduleList()
  
```

```
TrialAcc ▷ User
+ UserID
+ Name
+ TrialList
+ InvoiceList
+ ScheduleList
+ GetTrialList()
+ GetInvoiceList()
+ GetScheduleList()
```

```
Student ▷ User
+ UserID
+ Name
+ EnrolmentList
+ InvoiceList
+ ScheduleList
+ GetEnrolmentList()
+ GetInvoiceList()
+ GetScheduleList()
```

```
Parent ▷ User
+ UserID
+ Name
+ EnrolmentList
+ InvoiceList
+ ScheduleList
+ GetEnrolmentList()
+ GetInvoiceList()
+ GetScheduleList()
```

```
Staff ▷ User
+ UserID
+ Name
+ StaffRole
+ EnrolmentList
+ PaycheckList
+ ScheduleList
+ GetEnrolmentList()
+ GetPaycheckList()
+ GetScheduleList()

  
(subtypes noted in source: Teacher, Team, Ambassador) - later, ignore
```

```
Management ▷ User
+ UserID
+ Name
+ AccountManager()
+ ServiceManager()
+ EnrolmentManager()
+ ScheduleManager()
+ InterviewManager()
+ TrialManager()
```

---

## 3. Manager Classes

```
AccountManager
+ AccountManagerList
  - User (Staff/Student)
+ MakeUser()
+ GetUser()
+ SetUser()
+ AddUser()
+ RemoveUser()
```

```
EnrolmentManager
+ EnrolmentManagerList
  - EnrolmentItem
    + UserID
    + ServiceID
    + EnrolmentID
+ MakeEnrolment()
+ GetEnrolment()
+ SetEnrolment()
+ AddEnrolment()
+ RemoveEnrolment()
```

```
TrialManager
+ TrialManagerList
  - TrialItem
    + ScheduleItemID
    + TrialAccID
    + ServiceID
    + Feedback
    + TrialID
+ MakeTrial()
+ GetTrial()
+ SetTrial()
+ AddTrial()
+ RemoveTrial()
```

```
InterviewManager
+ InterviewManagerList
	- InterviewItem
		+ ScheduleItemID
		+ InterviewAccID
		+ ServiceID
		+ TaskSubmissionLink
		+ InterviewID
+ MakeInterview()
+ GetInterview()
+ SetInterview()
+ AddInterview()
+ RemoveInterview()
```

```
AttendanceManager
+ AttendanceManagerList
  - AttendanceItem
    + ScheduleItemID
    + AttendanceID
    + UserID
    + Date
    + Status
    + ScheduledDuration
    + LoggedDuration
    + LoggedBy
+ MakeAttendance()
+ GetAttendance()
+ SetAttendance()
+ AddAttendance()
+ RemoveAttendance()
```

```
RegFormManager
+ RegFormList
  - RegFormItem
    + RegFormID
    + Name
    + RequestedType
    + Status
+ MakeRegForm()
+ GetRegForm()
+ SetRegForm()
+ AddRegForm()
+ RemoveRegForm()
```

```
InvoiceManager
+ InvoiceManagerList
  - InvoiceItem
    + StudentID
    + ServiceID
    + Year
    + Month
    + ScheduledHours
    + AttendedHours
    + Amount
    + INRAmount
    + INRDue
    + InvoiceID
+ MakeInvoice()
+ GetInvoice()
+ SetInvoice()
+ AddInvoice()
+ RemoveInvoice()
```


```
PaycheckManager
+ PaycheckManagerList
  - PaycheckItem
    + StaffID
    + ServiceID
    + Year
    + Month
    + ScheduledHours
    + AttendedHours
    + Amount
    + INRAmount
    + INRDue
    + PaycheckID
+ MakePaycheck()
+ GetPaycheck()
+ SetPaycheck()
+ AddPaycheck()
+ RemovePaycheck()
```

```
ScheduleManager
+ ScheduleManagerList
  - ScheduleItem
    + Date
    + Duration
    + Time
    + Facilitator
    + OccuranceID
    + ServiceType
    + ServiceName
    + ServiceID
    + ScheduleID
+ MakeSchedule()
+ GetSchedule()
+ SetSchedule()
+ AddSchedule()
+ RemoveSchedule()
+ DisplaySchedule()
```

```
ServiceManager
+ ServiceManagerList
  - ServiceItem
    + OccuranceList
      - OccuranceItem
        + Day
        + Duration
        + Time
        + Facilitator
        + OccuranceID
    + Type
    + Name
    + MonthlyCost
    + ServiceID
+ MakeService()
+ GetService()
+ SetService()
+ AddService()
+ RemoveService()
```

---

## 4. Top-level Workflow

```
RegForm 
	-> Management -> IntervAccMaker -> InterScheduler -> TaskCollector* -> OfferLetterSender -> StaffAcc
    -> TrialAccMaker -> TrialScheduler -> TrialFeedbackCollector -> InvoiceSender -> StudentAccount

InterviewAcc 
	-> ScheduleDisplayer + InterviewDatetimeRequestor + TaskSubmitter* + OfferLetterAcceptor
TrialAcc
	-> ScheduleDisplayer + TrialDatetimeRequestor + FeedbackSubmitter + InvoicePayer
Staff (Teacher, Team, Ambassador)
	-> ScheduleDisplayer + AttendanceLogger + PaycheckDisplayer
Student      
	-> ScheduleDisplayer + AttendanceLogger + InvoiceDisplayer
Parent       
	-> StudentScheduleDisplayer + InvoiceDisplayer

Management 
	-> AccountMaker (different types with user and pass)
	-> Staff/StudentServiceManager (occurrence made at service creation time
		- service has monthly cost only first
		- number of hours comes from occurrence count and durations)
   -> InterviewTracker -> InterviewDatetimeApprover + FeedbackSender -> StaffAccMade
   -> TrialTracker -> TrialDatetimeApprover + InvoiceSender -> StudentAccMade
   -> Staff/StudentServiceEnroller
   -> StaffTracker -> AttendanceHistory -> PaycheckSender
   -> StudentTracker -> AttendanceHistory -> InvoiceSender
```
