import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function formatDate(date) {
  if (!date) return "";

  const [year, month, day] = date.split("-");

  return `${day}-${month}-${year}`;
}

function getLastThreeDates() {
  const dates = [];

  for (let i = 0; i < 3; i++) {
    const date = new Date();

    date.setDate(
      date.getDate() - i
    );

    dates.push(
      `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`
    );
  }

  return dates;
}

function Reports() {
  const navigate = useNavigate();

  const [section, setSection] =
    useState("3RD-CSE_23");

  const [subject, setSubject] =
    useState("Data Structures");

  const [selectedDate, setSelectedDate] =
    useState("");

  const [students, setStudents] =
    useState([]);

  const [records, setRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const dates = useMemo(
    () => getLastThreeDates(),
    []
  );

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);

      /*
       * Load students from Supabase
       */

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          "id, section, roll_no, name"
        )
        .eq("section", section)
        .order("roll_no", {
          ascending: true,
        });

      if (studentError) {
        console.error(studentError);

        alert(
          "Could not load students: " +
            studentError.message
        );

        setStudents([]);
        setRecords([]);
        setSelectedDate("");
        setLoading(false);

        return;
      }

      const loadedStudents =
        studentData || [];

      setStudents(loadedStudents);

      /*
       * Load attendance for the
       * last three dates
       */

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(
          "section, subject, attendance_date, roll_no, status"
        )
        .eq("section", section)
        .eq("subject", subject)
        .in("attendance_date", dates);

      if (attendanceError) {
        console.error(
          attendanceError
        );

        alert(
          "Could not load attendance: " +
            attendanceError.message
        );

        setRecords([]);
        setSelectedDate("");
        setLoading(false);

        return;
      }

      /*
       * Convert Supabase rows into
       * the structure used by the UI.
       *
       * Example:
       *
       * {
       *   date: "2026-10-02",
       *   section: "3RD-CSE_23",
       *   subject: "Data Structures",
       *   attendance: {
       *     "01": true,
       *     "02": false
       *   }
       * }
       */

      const groupedRecords =
        dates
          .map((date) => {
            const rows =
              (attendanceData || []).filter(
                (row) =>
                  row.attendance_date ===
                  date
              );

            if (rows.length === 0) {
              return null;
            }

            const attendance = {};

            rows.forEach((row) => {
              attendance[
                String(row.roll_no)
              ] = Boolean(row.status);
            });

            return {
              date,
              section,
              subject,
              attendance,
            };
          })
          .filter(Boolean);

      setRecords(groupedRecords);

      /*
       * Select latest available
       * attendance record
       */

      if (groupedRecords.length > 0) {
        setSelectedDate(
          groupedRecords[0].date
        );
      } else {
        setSelectedDate("");
      }

      setLoading(false);
    };

    loadReports();
  }, [
    section,
    subject,
    dates,
  ]);

  const selectedRecord =
    records.find(
      (record) =>
        record.date === selectedDate
    );

  /*
   * Calculate summary
   */

  const presentCount =
    selectedRecord
      ? students.filter(
          (student) =>
            selectedRecord
              .attendance[
              String(
                student.roll_no
              )
            ]
        ).length
      : 0;

  const absentCount =
    students.length -
    presentCount;

  const attendancePercentage =
    students.length > 0
      ? (
          (presentCount /
            students.length) *
          100
        ).toFixed(1)
      : "0.0";

  /*
   * Export CSV
   */

  const exportCSV = () => {
    if (!selectedRecord) {
      alert(
        "No attendance record available for this date."
      );

      return;
    }

    const rows = [
      [
        "Date",
        "Section",
        "Subject",
        "Roll No",
        "Student Name",
        "Status",
      ],
    ];

    students.forEach(
      (student) => {
        const isPresent =
          Boolean(
            selectedRecord
              .attendance[
              String(
                student.roll_no
              )
            ]
          );

        rows.push([
          formatDate(
            selectedRecord.date
          ),
          selectedRecord.section,
          selectedRecord.subject,
          student.roll_no,
          student.name,
          isPresent
            ? "Present"
            : "Absent",
        ]);
      }
    );

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(
                value
              ).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download = `attendance-${section}-${subject}-${selectedRecord.date}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-page">

      <button
        className="back-button"
        onClick={() =>
          navigate(
            "/dashboard"
          )
        }
      >
        <ArrowLeft size={18} />
        Dashboard
      </button>

      <div className="reports-title">

        <div>
          <h2>
            Attendance Reports
          </h2>

          <p>
            View attendance records
            from the last 3 days
          </p>
        </div>

        <button
          className="export-button"
          onClick={exportCSV}
          disabled={
            !selectedRecord
          }
        >
          <Download size={18} />
          Export CSV
        </button>

      </div>

      <div className="report-filters">

        <div>
          <label>
            Section
          </label>

          <select
            value={section}
            onChange={(e) => {
              setSection(
                e.target.value
              );
              setSelectedDate("");
            }}
          >
            <option value="3RD-CSE_23">
              3RD-CSE_23
            </option>

            <option value="3RD-CSE_24">
              3RD-CSE_24
            </option>

            <option value="3RD-CSE_25">
              3RD-CSE_25
            </option>
          </select>
        </div>

        <div>
          <label>
            Subject
          </label>

          <select
            value={subject}
            onChange={(e) => {
              setSubject(
                e.target.value
              );
              setSelectedDate("");
            }}
          >
            <option value="Data Structures">
              Data Structures
            </option>

            <option value="Database Management">
              Database Management
            </option>

            <option value="Operating Systems">
              Operating Systems
            </option>

            <option value="Computer Networks">
              Computer Networks
            </option>
          </select>
        </div>

      </div>

      <div className="report-days">

        {dates.map((date) => {

          const recordExists =
            records.some(
              (record) =>
                record.date === date
            );

          return (
            <button
              key={date}
              className={
                selectedDate === date
                  ? "selected-day"
                  : ""
              }
              onClick={() =>
                setSelectedDate(
                  date
                )
              }
            >

              <span>
                {formatDate(date)}
              </span>

              <small>
                {recordExists
                  ? "Attendance saved"
                  : "No record"}
              </small>

            </button>
          );
        })}

      </div>

      {loading ? (

        <div className="no-report">

          <FileText size={42} />

          <h3>
            Loading report...
          </h3>

          <p>
            Fetching attendance
            from database.
          </p>

        </div>

      ) : selectedRecord ? (

        <>

          <div className="report-summary">

            <div>
              <span>
                Total Students
              </span>

              <strong>
                {students.length}
              </strong>
            </div>

            <div className="report-present">
              <span>
                Present
              </span>

              <strong>
                {presentCount}
              </strong>
            </div>

            <div className="report-absent">
              <span>
                Absent
              </span>

              <strong>
                {absentCount}
              </strong>
            </div>

            <div className="report-percentage">
              <span>
                Attendance
              </span>

              <strong>
                {attendancePercentage}%
              </strong>
            </div>

          </div>

          <div className="report-table-card">

            <div className="report-table-header">

              <span>
                Roll No.
              </span>

              <span>
                Student Name
              </span>

              <span>
                Status
              </span>

            </div>

            {students.map(
              (student) => {

                const isPresent =
                  Boolean(
                    selectedRecord
                      .attendance[
                      String(
                        student.roll_no
                      )
                    ]
                  );

                return (
                  <div
                    className="report-table-row"
                    key={
                      student.id
                    }
                  >

                    <span>
                      {
                        student.roll_no
                      }
                    </span>

                    <strong>
                      {
                        student.name
                      }
                    </strong>

                    <span
                      className={
                        isPresent
                          ? "report-status-present"
                          : "report-status-absent"
                      }
                    >
                      {isPresent
                        ? "Present"
                        : "Absent"}
                    </span>

                  </div>
                );
              }
            )}

          </div>

        </>

      ) : (

        <div className="no-report">

          <FileText size={42} />

          <h3>
            No attendance record
          </h3>

          <p>
            Attendance has not been
            saved for the selected
            date.
          </p>

          <button
            onClick={() =>
              navigate(
                "/attendance"
              )
            }
          >
            Mark Attendance
          </button>

        </div>

      )}

    </div>
  );
}

export default Reports;