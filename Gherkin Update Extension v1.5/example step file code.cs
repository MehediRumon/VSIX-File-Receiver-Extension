using UMS.UI.Test.BusinessModel.Helper;
using UMS.UI.Test.ERP.Areas.Common;
using UMS.UI.Test.ERP.Areas.Student.Attendance.Elements;
using UMS.UI.Test.ERP.Areas.Student.Attendance.Pages;

namespace UMS.UI.Test.ERP.Areas.Student.Attendance.Steps
{
    [Binding]
    public class ClearClassAttendanceStep(ClearClassAttendancePage page)
    {
        private IWebElement? _webElement;
        private static SelectElement SelectElement(IWebElement webElement) => new(webElement);

        [Given("Go To The Clear Class Attendance Page")]
        public void GivenGoToTheClearClassAttendancePage()
        {
            page.GetClearClassAttendanceGroup().Click();
            Thread.Sleep(500);
        }

        [When("Select ClearClassAttendance Organization {string}")]
        public void WhenSelectClearClassAttendanceOrganization(string organization)
        {
            _webElement = page.GetOrganization();
            SelectElement(_webElement).SelectByText(organization);;
        }

        [When("Select ClearClassAttendance Program {string}")]
        public void WhenSelectClearClassAttendanceProgram(string program)
        {
            _webElement = page.GetProgram();
            SelectElement(_webElement).SelectByText(program);
        }

        [When("Select ClearClassAttendance Session {string}")]
        public void WhenSelectClearClassAttendanceSession(string session)
        {
            _webElement = page.GetSession();
            SelectElement(_webElement).SelectByText(session);
        }

        [When("Select ClearClassAttendance Course Name {string}")]
        public void WhenSelectClearClassAttendanceCourseName(string courseNames)
        {
            _webElement = page.GetCourseName();
            var courseName = TestHelper.GetStringsBySplit(courseNames);
            if(courseName.Count ==0)
                courseName.Add("All Course");
            foreach (var course in courseName)
                SelectElement(_webElement).SelectByText(course);
        }

        [When("Select ClearClassAttendance Mother Course {string}")]
        public void WhenSelectClearClassAttendanceMotherCourse(string motherCourses)
        {
            _webElement = page.GetMotherCourse();
            var motherCourse = TestHelper.GetStringsBySplit(motherCourses);
            if (motherCourse.Count == 0)
                motherCourse.Add("None");
            foreach (var course in motherCourse)
                SelectElement(_webElement).SelectByText(course);
            WaitHelper.WaitForOptionsToLoad(page.Driver, 10, page.GetBranch());
        }

        [When("Select ClearClassAttendance Branch {string}")]
        public void WhenSelectClearClassAttendanceBranch(string branch)
        {
            _webElement = page.GetBranch();
            var branches = TestHelper.GetStringsBySplit(branch);
            if (branches.Count == 0)
                branches.Add("All Branch");
            foreach (var item in branches)
                SelectElement(_webElement).SelectByText(item);
        }

        [When("Select ClearClassAttendance Campus {string}")]
        public void WhenSelectClearClassAttendanceCampus(string campus)
        {
            _webElement = page.GetCampus();
            var campuses = TestHelper.GetStringsBySplit(campus);
            if (campuses.Count == 0)
                campuses.Add("All Campus");
            foreach (var item in campuses)
                SelectElement(_webElement).SelectByText(item);
        }

        [When("Select ClearClassAttendance Batch Type {string}")]
        public void WhenSelectClearClassAttendanceBatchType(string batchType)
        {
            _webElement = page.GetBatchType();
            var batchTypes = batchType
                             .Split(';', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                             .ToList();
            if (batchTypes.Count == 0)
                batchTypes.Add("All Batch Type");
            foreach (var item in batchTypes)
                SelectElement(_webElement).SelectByText(item);
        }

        [When("Select ClearClassAttendance Batch Time {string}")]
        public void WhenSelectClearClassAttendanceBatchTime(string batchTime)
        {
            _webElement = page.GetBatchTime();
            var batchTimes = TestHelper.GetStringsBySplit(batchTime);
            if (batchTimes.Count == 0)
                batchTimes.Add("All Batch Time");
            foreach (var item in batchTimes)
                SelectElement(_webElement).SelectByText(item);
        }

        [When("Select ClearClassAttendance Batch Name {string}")]
        public void WhenSelectClearClassAttendanceBatchName(string batchName)
        {
            _webElement = page.GetBatchName();
            var batchNames = TestHelper.GetStringsBySplit(batchName);
            if (batchNames.Count == 0)
                batchNames.Add("All Batch");
            foreach (var item in batchNames)
                SelectElement(_webElement).SelectByText(item);
        }

        [When("Enter ClearClassAttendance Date From {string}")]
        public void WhenEnterClearClassAttendanceDateFrom(string dateFrom)
        {
            string day = DateTime.Parse(dateFrom).Day.ToString();
            dateFrom = !string.IsNullOrEmpty(dateFrom)
                ? dateFrom
                : DateTime.Now.AddMonths(1).ToString("MMMM yyyy");
            page.Js.ExecuteScript($"arguments[0].value = '{dateFrom}';", page.GetDateFrom());
        }

        [When("Enter ClearClassAttendance Date To {string}")]
        public void WhenEnterClearClassAttendanceDateTo(string dateTo)
        {
            string day = DateTime.Parse(dateTo).Day.ToString();
            dateTo = !string.IsNullOrEmpty(dateTo)
                ? dateTo
                : DateTime.Now.AddMonths(1).ToString("MMMM yyyy");
            page.Js.ExecuteScript($"arguments[0].value = '{dateTo}';", page.GetDateTo());
            page.GetDateTo().Click();
            Thread.Sleep(500);
            page.GetActiveDate(day).Click(); 
            Thread.Sleep(1000);
        }

        [When("Select ClearClassAttendance Lecture {string}")]
        public void WhenSelectClearClassAttendanceLecture(string lecture)
        {
            _webElement = page.GetLecture();
            var lectures = TestHelper.GetStringsBySplit(lecture);
            if (lectures.Count == 0)
                lectures.Add("All Lecture");
            foreach (var item in lectures)
                SelectElement(_webElement).SelectByText(item);
        }

        [When("Select ClearClassAttendance Teacher {string}")]
        public void WhenSelectClearClassAttendanceTeacher(string teacher)
        {
            _webElement = page.GetTeacher();
            var teachers = TestHelper.GetStringsBySplit(teacher);
            if (teachers.Count == 0)
                teachers.Add("All Teacher");
            foreach (var item in teachers)
                SelectElement(_webElement).SelectByText(item);
        }

        [When("Select ClearClassAttendance User {string}")]
        public void WhenSelectClearClassAttendanceUser(string user)
        {
            _webElement = page.GetUser();
            var users = TestHelper.GetStringsBySplit(user);
            if (users.Count == 0)
                users.Add("All User");
            foreach (var item in users)
                SelectElement(_webElement).SelectByText(item);
        }

        [When("Click On ClearClassAttendance Student Count")]
        public void WhenClickOnClearClassAttendanceStudentCount()
        {
            page.GetStudentCount().Click();
            Thread.Sleep(500);
            WaitHelper.WebElementIsInvisible(page.Driver, 30, ClassAttendanceEntryElement.LoadingSpinner);
            Thread.Sleep(1000);
            int studentCount = int.Parse(page.GetCountValue().GetAttribute("value"));
            TestHelper.ShowMessageBox($"Student Count: {studentCount}");
            Assert.True(studentCount > 0, "Student Count is not greater than 0.");
        }

        [When("Click On ClearClassAttendance Submit")]
        public void WhenClickOnClearClassAttendanceSubmit()
        {
            page.GetSubmitBtn().Click();
        }

        [When("Click On ClearClassAttendance Confirm Button")]
        public void WhenClickOnClearClassAttendanceConfirmButton()
        {
            page.GetModalConfirmButton().Click();
        }

    }
}
