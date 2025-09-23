multi Select code example:
        [When("Select ClearClassAttendance User {string}")]
        public void WhenSelectClearClassAttendanceUser(string user)
        {
            _webElement = page.GetUser();
            var users = TestHelper.GetStringsBySplit(user);
            foreach (var item in users)
                SelectElement(_webElement).SelectByText(item);
        }



normal select code example:
        [When("Select ClearClassAttendance Organization {string}")]
        public void WhenSelectClearClassAttendanceOrganization(string organization)
        {
            _webElement = page.GetOrganization();
            SelectElement(_webElement).SelectByText(organization);;
        }





normal input field code example:
        [When("Enter ExamAttendanceReport Display Per Page {string}")]
        public void WhenEnterExamAttendanceReportDisplayPerPage(string displayPerPage)
        {
            _webElement = page.GetDisplayPerPage();
            _webElement.Clear();
            _webElement.SendKeys(displayPerPage);
        }





search dropdown code example:
        [When("Click On ExamAttendanceReport Mother Course {string}")]
        public void WhenClickOnExamAttendanceReportMotherCourse(string motherCourse)
        {
            page.GetMotherCourse().Click();
            TestHelper.SelectMultiItems(page.Driver, motherCourse);
        }




click code example:
        [When("Click On ExamAttendanceReport Course Name {string}")]
        public void WhenClickOnExamAttendanceReportCourseName(string courseName)
        {
            page.GetCourseName().Click();
        }

       

date from code example:
        [When("Enter ClassAttendanceReport Date From {string}")]
        public void WhenEnterClassAttendanceReportDateFrom(string dateFrom)
        {
            dateFrom = !string.IsNullOrEmpty(dateFrom)
               ? dateFrom
               : DateTime.Now.ToString("yyyy-MM-dd");
            page.Js.ExecuteScript($"arguments[0].value = '{dateFrom}';", dynamic method here like example : page.GetDateFrom());
        }


dete to code example:
        [When("Enter ClassAttendanceReport Date To {string}")]
        public void WhenEnterClassAttendanceReportDateTo(string dateTo)
        {
            dateTo = !string.IsNullOrEmpty(dateTo)
                ? dateTo
                : DateTime.Now.ToString("yyyy-MM-dd");
            page.Js.ExecuteScript($"arguments[0].value = '{dateTo}';", dynamic method here like example : page.GetDateTo());
        }



image upload code example:
        [When("Enter ManageGroup GroupImage {string}")]
        public void WhenEnterManageGroupGroupImage(string groupImg)
        {
            if (string.IsNullOrEmpty(groupImg))
                throw new Exception("Excel file does not have values for Group Image");

            var imgPath = AppHelper.GetFilePath("TestData\\Administration\\Image", groupImg);
            page.GetGroupImage().SendKeys(imgPath);
        }



excel upload code example:
        [When("Enter ManageGroup GroupExcel {string}")]
        public void WhenEnterManageGroupGroupExcel(string groupExcel)
        {
            if (string.IsNullOrEmpty(groupExcel))
                throw new Exception("Excel file does not have values for Group Excel");

            var excelPath = AppHelper.GetFilePath("TestData\\Administration\\Excel", groupExcel);
            page.GetGroupExcel().SendKeys(excelPath);
        }



excel file upload code example:
        [When("Select ClassAttendance Excel File {string}")]
        public void WhenSelectClassAttendanceExcelFile(string excelFileName)
        {
                page.GetBrowseExcelFile().SendKeys(AppHelper.GetFilePath("TestData\\Student\\Excel", excelFileName));
        }


