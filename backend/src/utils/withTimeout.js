/**
 * Races a promise against a timeout.
 * Throws an error with a clear message if the timeout fires first.
 *
 * @param {Promise} promise - The async operation to wrap
 * @param {number}  ms      - Timeout in milliseconds
 * @param {string}  label   - Name shown in the error message (e.g. 'Resend', 'Twilio')
 */
function withTimeout(promise, ms, label) {
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`${label} request timed out after ${ms}ms`)),
      ms
    )
  );
  return Promise.race([promise, timeout]);
}

module.exports = withTimeout;
