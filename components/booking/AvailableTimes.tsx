import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import { useEffect, useState, useMemo } from "react";
import getSlots from "../../lib/slots";
import Link from "next/link";
import { timeZone } from "../../lib/clock";
import { useRouter } from "next/router";
import { ExclamationIcon } from "@heroicons/react/solid";

const AvailableTimes = (props) => {
  const router = useRouter();
  const { user, rescheduleUid } = router.query;
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const times = useMemo(() => {
    const slots = getSlots({
      calendarTimeZone: props.user.timeZone,
      selectedTimeZone: timeZone(),
      eventLength: props.eventType.length,
      selectedDate: props.date,
      dayStartTime: props.user.startTime,
      dayEndTime: props.user.endTime,
    });

    return slots;
  }, [props.date]);

  const handleAvailableSlots = (busyTimes: []) => {
    // Check for conflicts
    for (let i = times.length - 1; i >= 0; i -= 1) {
      busyTimes.forEach((busyTime) => {
        const startTime = dayjs(busyTime.start);
        const endTime = dayjs(busyTime.end);

        // Check if start times are the same
        if (dayjs(times[i]).format("HH:mm") == startTime.format("HH:mm")) {
          times.splice(i, 1);
        }

        // Check if time is between start and end times
        if (dayjs(times[i]).isBetween(startTime, endTime)) {
          times.splice(i, 1);
        }

        // Check if slot end time is between start and end time
        if (dayjs(times[i]).add(props.eventType.length, "minutes").isBetween(startTime, endTime)) {
          times.splice(i, 1);
        }

        // Check if startTime is between slot
        if (startTime.isBetween(dayjs(times[i]), dayjs(times[i]).add(props.eventType.length, "minutes"))) {
          times.splice(i, 1);
        }
      });
    }
    // Display available times
    setLoaded(true);
  };

  // Re-render only when invitee changes date
  useEffect(() => {
    setLoaded(false);
    setError(false);
    fetch(
      `/api/availability/${user}?dateFrom=${props.date.startOf("day").utc().format()}&dateTo=${props.date
        .endOf("day")
        .utc()
        .format()}`
    )
      .then((res) => res.json())
      .then(handleAvailableSlots)
      .catch((e) => {
        console.error(e);
        setError(true);
      });
  }, [props.date]);

  return (
    <div className="sm:pl-4 mt-8 sm:mt-0 text-center sm:w-1/3  md:max-h-97 overflow-y-auto">
      <div className="text-gray-600 font-light text-xl mb-4 text-left">
        <span className="w-1/2">{props.date.format("dddd DD MMMM YYYY")}</span>
      </div>
      {!error &&
        loaded &&
        times.length > 0 &&
        times.map((time) => (
          <div key={dayjs(time).utc().format()}>
            <Link
              href={
                `/${props.user.username}/book?date=${dayjs(time).utc().format()}&type=${props.eventType.id}` +
                (rescheduleUid ? "&rescheduleUid=" + rescheduleUid : "")
              }>
              <a
                key={dayjs(time).format("hh:mma")}
                className="block font-medium mb-4 text-blue-600 border border-blue-600 rounded hover:text-white hover:bg-blue-600 py-4">
                {dayjs(time).tz(timeZone()).format(props.timeFormat)}
              </a>
            </Link>
          </div>
        ))}
      {!error && loaded && times.length == 0 && (
        <div className="w-full h-full flex flex-col justify-center content-center items-center -mt-4">
          <h1 className="text-xl font">{props.user.name} is all booked today.</h1>
        </div>
      )}
      {!error && !loaded && <div className="loader" />}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Could not load the available time slots.{" "}
                <a
                  href={"mailto:" + props.user.email}
                  className="font-medium underline text-yellow-700 hover:text-yellow-600">
                  Contact {props.user.name} via e-mail
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableTimes;
