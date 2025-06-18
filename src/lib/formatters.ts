/**
 * Formats a number as currency.  IDR(Indonesian Rupiah) by default
 */
export const formatCurrency = (amount: number, currency = 'IDR'): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function formatAngkaManual(angka: number) {
  if (angka < 1000) {
    return angka.toString();
  }

  const suffixes = [
    { value: 1, symbol: "" },
    { value: 1000, symbol: "Rb" },
    { value: 1_000_000, symbol: "Jt" },
    { value: 1_000_000_000, symbol: "M" }, // Anda bisa menambahkan 'M' untuk Miliar jika perlu
    { value: 1_000_000_000_000, symbol: "T" } // Dan 'T' untuk Triliun
  ];

  let i;
  for (i = suffixes.length - 1; i > 0; i--) {
    if (angka >= suffixes[i].value) {
      break;
    }
  }

  const num = angka / suffixes[i].value;
  // Memformat angka dengan 1 desimal jika diperlukan, tanpa desimal jika bulat
  const formattedNum = num % 1 === 0 ? num.toString() : num.toFixed(1).replace(/\.0$/, '');

  return formattedNum + suffixes[i].symbol;
}


/**
 * Formats a date as localized string
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
/**
 * Truncates a string to a specified length and adds an ellipsis
 */
export const truncateString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
};




/**
 * Formats a number as a currency string using Intl.NumberFormat.
 *
 * @param value The number to format.
 * @param currency The currency code (e.g., 'USD', 'EUR', 'GBP', 'JPY').
 * @param locale (Optional) The locale to use (e.g., 'en-US', 'de-DE', 'ja-JP').
 * If not provided, uses the browser's default locale.
 * @param options (Optional) Additional options to pass to Intl.NumberFormat.
 * @returns A string representing the formatted currency value, or "Invalid input"
 * if the input is not a valid number.
};
 */
// export const formatCurrency = (
//     value: number,
//     currency: string,
//     locale?: string,
//     options?: Intl.NumberFormatOptions
// ): string => {
//     if (typeof value !== 'number' || isNaN(value)) {
//         return "Invalid input";
//     }

//     try {
//         const formatter = new Intl.NumberFormat(locale, {
//             style: 'currency',
//             currency: currency,
//             ...options, // Allow overriding of style and currency if needed.
//         });
//         return formatter.format(value);
//     } catch (error) {
//         // Handle errors, such as invalid locale or currency
//         console.error("Error formatting currency:", error);
//         return "Error formatting currency"; // Or you could return the unformatted number
//     }
// };
// const formattedUSD = formatCurrency(1234.56, 'USD', 'en-US'); // "$1,234.56"
// const formattedEUR = formatCurrency(1234.56, 'EUR', 'de-DE'); // "1.234,56 €"
/**
 * A React component that demonstrates the use of the formatCurrency function.
 */
// const CurrencyFormatterExample = () => {
//     const amounts = [1234.56, 0, -1234.56, 1234567.89];
//     const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'IDR'];
//     const locales = [undefined, 'de-DE', 'en-US', 'ja-JP', 'id-ID']; // Include undefined to use default locale

//     return (
//         <div>
//             <h1>Currency Formatting Examples</h1>
//             <p>
//                 The <code>formatCurrency</code> function formats numbers as currency
//                 strings, handling different locales and currencies.  It uses
//                 <code>Intl.NumberFormat</code> for formatting.
//             </p>

//             <h2>Basic Usage</h2>
//             <ul>
//                 {amounts.map((amount, index) => (
//                     <li key={index}>
//                         Amount: {amount}, USD: {formatCurrency(amount, 'USD')}
//                     </li>
//                 ))}
//             </ul>

//             <h2>Different Currencies and Locales</h2>
//             <table>
//                 <thead>
//                     <tr>
//                         <th>Amount</th>
//                         {currencies.map((currency) => (
//                             <th key={currency}>{currency}</th>
//                         ))}
//                     </tr>
//                 </thead>
//                 <tbody>
//                     {locales.map((locale, localeIndex) => (
//                         <tr key={localeIndex}>
//                             <td>
//                                 {locale ? `Locale: ${locale}` : 'Default Locale'}
//                             </td>
//                             {amounts.map((amount, amountIndex) => {
//                                 const currencyCode = currencies[amountIndex % currencies.length]; //cycle through currencies
//                                 return (
//                                     <td key={`${localeIndex}-${amountIndex}`}>
//                                         {formatCurrency(amount, currencyCode, locale)}
//                                     </td>
//                                 );
//                             })}
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>
//             <h2>Error Handling</h2>
//             <ul>
//                 <li>
//                     Invalid input (not a number): {formatCurrency(NaN, 'USD')}
//                 </li>
//                 <li>
//                     Invalid input (string): {formatCurrency("abc" as any, 'USD')}
//                 </li>
//                 <li>
//                     Zero: {formatCurrency(0, 'USD')}
//                 </li>
//             </ul>
//             <h2>Additional Options</h2>
//              <p>
//                 You can pass additional options to customize the formatting.  For example,
//                 to control the number of decimal places:
//             </p>
//             <ul>
//                 <li>
//                     USD, 2 decimals: {formatCurrency(1234.567, 'USD', 'en-US', {
//                         minimumFractionDigits: 2,
//                         maximumFractionDigits: 2,
//                     })}
//                 </li>
//                  <li>
//                     USD, 0 decimals: {formatCurrency(1234.567, 'USD', 'en-US', {
//                         minimumFractionDigits: 0,
//                         maximumFractionDigits: 0,
//                     })}
//                 </li>
//             </ul>
//         </div>
//     );
// };

// export default CurrencyFormatterExample;
