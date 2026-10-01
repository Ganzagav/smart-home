// Table of the last commands for all LEDs, read from the Command table in PostgreSQL.
// Shows the first 5 rows. "Show more" adds 5 more rows each time; "Show less" goes back to 5.
import { useState } from "react";
import { colorOf } from "./colors.js";

const PAGE_SIZE = 5;
const time = (d) => (d ? new Date(d).toLocaleTimeString() : "—");

export default function CommandHistory({ commands }) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const rows = commands.slice(0, visible);
  const hasMore = commands.length > visible;
  const canShowLess = visible > PAGE_SIZE;

  return (
    <section className="glass history">
      <div className="history-head">
        <h2>Activity</h2>
        {commands.length > 0 && (
          <span className="muted count">
            Showing {rows.length} of {commands.length}
          </span>
        )}
      </div>

      {commands.length === 0 ? (
        <p className="muted">No commands yet. Tap a button to start.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Light</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Clicked</th>
                  <th>Delivered</th>
                  <th>Executed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="muted">{c.id}</td>
                    <td>
                      <span className="dot" style={{ "--led": colorOf(c.led.color) }} />
                      {c.led.name}
                    </td>
                    <td>{c.action}</td>
                    <td>
                      <span className={`badge ${c.status.toLowerCase()}`}>{c.status}</span>
                    </td>
                    <td>{time(c.createdAt)}</td>
                    <td>{time(c.deliveredAt)}</td>
                    <td>{time(c.executedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(hasMore || canShowLess) && (
            <div className="history-actions">
              {hasMore && (
                <button className="more-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Show more
                </button>
              )}
              {canShowLess && (
                <button className="more-btn ghost" onClick={() => setVisible(PAGE_SIZE)}>
                  Show less
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
