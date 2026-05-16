// src/services/result-import-validation.service.js
// Advanced error handling and validation for result imports

/**
 * Validate single result row
 */
function validateResultRow(row, expectedFields = ['bib_number', 'elapsed_time'], index = 0) {
  const errors = [];

  if (!row) {
    return {
      valid: false,
      errors: [{ field: 'row', category: 'missing_field', message: 'Row is empty' }],
      row_index: index
    };
  }

  // Check required fields
  for (const field of expectedFields) {
    if (row[field] === undefined || row[field] === null || row[field] === '') {
      errors.push({
        field,
        category: 'missing_field',
        message: `Required field '${field}' is missing or empty`
      });
    }
  }

  // Validate data types
  if (row.bib_number !== undefined && row.bib_number !== null) {
    if (typeof row.bib_number !== 'string' && typeof row.bib_number !== 'number') {
      errors.push({
        field: 'bib_number',
        category: 'invalid_format',
        message: `Bib number must be string or number, got ${typeof row.bib_number}`,
        suggestion: `Convert to string: "${row.bib_number}"`
      });
    }
  }

  if (row.elapsed_time !== undefined && row.elapsed_time !== null) {
    if (!isValidTimeFormat(row.elapsed_time)) {
      errors.push({
        field: 'elapsed_time',
        category: 'invalid_format',
        message: `Invalid time format: "${row.elapsed_time}". Expected HH:MM:SS or MM:SS`,
        suggestion: `Convert to format HH:MM:SS (e.g., 01:23:45)`
      });
    }
  }

  if (row.distance_km !== undefined && row.distance_km !== null) {
    const distanceNum = parseFloat(row.distance_km);
    if (isNaN(distanceNum) || distanceNum <= 0) {
      errors.push({
        field: 'distance_km',
        category: 'invalid_format',
        message: `Distance must be positive number, got "${row.distance_km}"`,
        suggestion: `Use a positive number (e.g., 5.5)`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    row_index: index
  };
}

/**
 * Categorize and summarize import errors
 */
function categorizeErrors(errors) {
  const categories = {
    missing_field: [],
    invalid_format: [],
    duplicate: [],
    constraint_violation: [],
    not_found: [],
    other: []
  };

  for (const error of errors) {
    const category = error.category || 'other';
    if (categories[category]) {
      categories[category].push(error);
    } else {
      categories.other.push(error);
    }
  }

  return {
    total: errors.length,
    by_category: categories,
    summary: Object.entries(categories)
      .filter(([_, items]) => items.length > 0)
      .map(([cat, items]) => `${items.length} ${cat.replace(/_/g, ' ')}`)
      .join(', ')
  };
}

/**
 * Check if time format is valid
 */
function isValidTimeFormat(timeStr) {
  if (typeof timeStr !== 'string') return false;

  // Accept formats: HH:MM:SS, MM:SS with minutes/seconds 00-59
  // Elapsed time can exceed 24 hours for multi-day events
  const timeRegex = /^(\d{1,2}):([0-5]\d):([0-5]\d)(\.\d+)?$|^(\d{1,2}):([0-5]\d)$/;
  return timeRegex.test(timeStr);
}

/**
 * Convert time string to milliseconds
 */
function timeToMilliseconds(timeStr) {
  if (!isValidTimeFormat(timeStr)) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let ms = 0;

  const parts = timeStr.split(':');
  if (parts.length === 3) {
    // HH:MM:SS.mmm format
    hours = parseInt(parts[0]);
    minutes = parseInt(parts[1]);
    const secondsPart = parts[2].split('.');
    seconds = parseInt(secondsPart[0]);
    ms = secondsPart[1] ? parseInt(secondsPart[1].padEnd(3, '0')) : 0;
  } else if (parts.length === 2) {
    // MM:SS format
    minutes = parseInt(parts[0]);
    const secondsPart = parts[1].split('.');
    seconds = parseInt(secondsPart[0]);
    ms = secondsPart[1] ? parseInt(secondsPart[1].padEnd(3, '0')) : 0;
  }

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms;
}

/**
 * Generate error suggestions for common issues
 */
function generateErrorSuggestions(errorCategory, context = {}) {
  const suggestions = {
    missing_field: [
      'Check that all required columns are present in the import file',
      'Verify column headers match expected format',
      'Ensure no rows have missing values in required fields'
    ],
    invalid_format: [
      'Verify data types match expected format (numbers vs. strings)',
      'Check time format: use HH:MM:SS format',
      'Ensure bibs are zero-padded if needed (e.g., 001 instead of 1)'
    ],
    duplicate: [
      'Remove duplicate bib numbers or registrations from the file',
      'Check if bib was already assigned in this event',
      'Verify each registration appears only once'
    ],
    constraint_violation: [
      'Ensure bib numbers are unique within the event',
      'Check that referenced registrations exist',
      'Verify all required relationships are satisfied'
    ],
    not_found: [
      'Verify bib number exists in the system',
      'Check that registration has been added to this event',
      'Ensure event ID is correct'
    ]
  };

  return suggestions[errorCategory] || suggestions.other || [];
}

/**
 * Validate entire batch of results
 */
function validateResultBatch(rows, expectedFields = ['bib_number', 'elapsed_time']) {
  const results = [];
  const allErrors = [];
  const validRows = [];

  for (let i = 0; i < rows.length; i++) {
    const validation = validateResultRow(rows[i], expectedFields, i + 1);
    if (validation.valid) {
      validRows.push({ ...rows[i], row_index: i + 1 });
    } else {
      allErrors.push(...validation.errors.map(e => ({ ...e, row_index: i + 1 })));
      results.push({
        row_index: i + 1,
        status: 'validation_failed',
        errors: validation.errors
      });
    }
  }

  const errorSummary = categorizeErrors(allErrors);

  return {
    total_rows: rows.length,
    valid_rows: validRows.length,
    failed_rows: results.length,
    error_summary: errorSummary,
    invalid_rows: results,
    valid_rows_data: validRows,
    can_retry: allErrors.some(e => e.category !== 'constraint_violation'),
    retry_suggestions: generateErrorSuggestions(
      Object.entries(errorSummary.by_category)
        .find(([_, items]) => items.length > 0)?.[0] || 'other'
    )
  };
}

/**
 * Generate CSV from errors
 */
function generateErrorCSV(errors) {
  if (errors.length === 0) {
    return 'No errors';
  }

  const headers = ['Row', 'Field', 'Category', 'Message', 'Suggestion'];
  const rows = [];

  for (const error of errors) {
    rows.push([
      error.row_index || '',
      error.field || '',
      error.category || '',
      (error.message || '').replace(/"/g, '""'),
      (error.suggestion || '').replace(/"/g, '""')
    ]);
  }

  let csv = headers.map(h => `"${h}"`).join(',') + '\n';
  for (const row of rows) {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  }

  return csv;
}

module.exports = {
  validateResultRow,
  validateResultBatch,
  categorizeErrors,
  isValidTimeFormat,
  timeToMilliseconds,
  generateErrorSuggestions,
  generateErrorCSV
};
