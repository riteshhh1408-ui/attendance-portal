import { ArrowLeft, Clock, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

const timetable = [
  {
    day: "Monday",
    classes: [
      {
        subject: "Data Structures",
        section: "3RD-CSE_23",
        start: "11:00 AM",
        end: "12:00 PM",
        room: "C-15",
      },
      {
        subject: "Database Management",
        section: "3RD-CSE_23",
        start: "02:00 PM",
        end: "03:00 PM",
        room: "C-15",
      },
    ],
  },
  {
    day: "Tuesday",
    classes: [
      {
        subject: "Data Structures",
        section: "3RD-CSE_23",
        start: "09:00 AM",
        end: "10:00 AM",
        room: "C-15",
      },
      {
        subject: "Operating Systems",
        section: "3RD-CSE_23",
        start: "12:00 PM",
        end: "01:00 PM",
        room: "C-16",
      },
    ],
  },
  {
    day: "Wednesday",
    classes: [
      {
        subject: "Database Management",
        section: "3RD-CSE_23",
        start: "11:00 AM",
        end: "12:00 PM",
        room: "C-15",
      },
    ],
  },
  {
    day: "Thursday",
    classes: [
      {
        subject: "Data Structures",
        section: "3RD-CSE_23",
        start: "11:00 AM",
        end: "12:00 PM",
        room: "C-15",
      },
      {
        subject: "Computer Networks",
        section: "3RD-CSE_23",
        start: "03:00 PM",
        end: "04:00 PM",
        room: "C-17",
      },
    ],
  },
  {
    day: "Friday",
    classes: [
      {
        subject: "Operating Systems",
        section: "3RD-CSE_23",
        start: "10:00 AM",
        end: "11:00 AM",
        room: "C-16",
      },
    ],
  },
];

function Timetable() {
  const navigate = useNavigate();

  return (
    <div className="timetable-page">
      <button
        className="back-button"
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft size={18} />
        Dashboard
      </button>

      <div className="timetable-title">
        <div>
          <h2>Timetable</h2>
          <p>Your weekly teaching schedule</p>
        </div>

        <div className="week-badge">
          Current Week
        </div>
      </div>

      <div className="timetable-card">
        <div className="timetable-header">
          <span>Day</span>
          <span>Subject</span>
          <span>Section</span>
          <span>Time</span>
          <span>Location</span>
        </div>

        {timetable.map((day) =>
          day.classes.map((item, index) => (
            <div
              className="timetable-row"
              key={`${day.day}-${item.subject}-${index}`}
            >
              <strong>{day.day}</strong>

              <div>
                <strong>{item.subject}</strong>
              </div>

              <span>{item.section}</span>

              <span className="time-cell">
                <Clock size={15} />
                {item.start} - {item.end}
              </span>

              <span className="room-cell">
                <MapPin size={15} />
                {item.room}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Timetable;