/**
 * BSD 3-Clause License
 *
 * Copyright (c) 2019, james@sparkworks.io
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * - Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import checkPermission from '@salesforce/apex/PermissionService.checkPermission';

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0,
            v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

const hasPermission = async apiName => {
    const response = await checkPermission({ apiName: apiName });
    return response;
};

// Straight from component library playground
const fetchFakeDataHelper = async ({ amountOfRecords }) => {
    const recordMetadata = {
        name: 'name',
        email: 'email',
        website: 'url',
        amount: 'currency',
        phone: 'phoneNumber',
        closeAt: 'dateInFuture'
    };
    const response = await fetch('https://data-faker.herokuapp.com/collection', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
            amountOfRecords,
            recordMetadata
        })
    });
    return response.json();
};

const createSetFromDelimitedString = (string, delimiter) => {
    // remove all white space in and around
    return new Set(string.replace(/\s+/g, '').split(delimiter));
};

// https://muffinresearch.co.uk/removing-leading-whitespace-in-es6-template-strings/
const convertToSingleLineString = (strings, ...values) => {
    // Interweave the strings with the substitution vars first.
    let output = '';
    for (let i = 0; i < values.length; i++) {
        output += strings[i] + values[i];
    }
    output += strings[values.length];

    // Split on newlines.
    let lines = output.split(/(?:\r\n|\n|\r)/);

    // Rip out the leading whitespace.
    return lines
        .map(line => {
            return line.replace(/^\s+/gm, '');
        })
        .join(' ')
        .trim();
};

/**
 * Reduces one or more LDS errors into a string[] of error messages.
 * @param {FetchResponse|FetchResponse[]} errors
 * @return {String[]} Error messages
 */
const reduceErrors = errors => {
    if (!Array.isArray(errors)) {
        errors = [errors];
    }

    return (
        errors
            // Remove null/undefined items
            .filter(error => !!error)
            // Extract an error message
            .map(error => {
                console.log(error);
                // UI API read errors
                if (Array.isArray(error.body)) {
                    return error.body.map(e => e.message);
                }
                // FIELD VALIDATION, FIELD, and trigger.addError
                else if (
                    error.body &&
                    error.body.enhancedErrorType &&
                    error.body.enhancedErrorType.toLowerCase() === 'recorderror' &&
                    error.body.output
                ) {
                    let firstError = '';
                    if (
                        error.body.output.errors.length &&
                        error.body.output.errors[0].errorCode === 'INSUFFICIENT_ACCESS_OR_READONLY'
                    ) {
                        firstError = error.body.output.errors[0].message;
                    }
                    if (
                        error.body.output.errors.length &&
                        error.body.output.errors[0].errorCode === 'FIELD_CUSTOM_VALIDATION_EXCEPTION'
                    ) {
                        firstError = error.body.output.errors[0].message;
                    }
                    if (
                        error.body.output.errors.length &&
                        error.body.output.errors[0].errorCode === 'CANNOT_EXECUTE_FLOW_TRIGGER'
                    ) {
                        firstError = error.body.output.errors[0].message;
                    }
                    if (!error.body.output.errors.length && error.body.output.fieldErrors) {
                        // It's in a really weird format...
                        firstError =
                            error.body.output.fieldErrors[Object.keys(error.body.output.fieldErrors)[0]][0].message;
                    }
                    return firstError;
                }
                // UI API DML, Apex and network errors
                else if (error.body && typeof error.body.message === 'string') {
                    return error.body.message;
                }
                // PAGE ERRORS
                else if (error.body && error.body.pageErrors.length) {
                    return error.body.pageErrors[0].message;
                }
                // JS errors
                else if (typeof error.message === 'string') {
                    return error.message;
                }
                // Unknown error shape so try HTTP status text
                return error.statusText;
            })
            // Flatten
            .reduce((prev, curr) => prev.concat(curr), [])
            // Remove empty strings
            .filter(message => !!message)
    );
};

export {
    generateUUID,
    hasPermission,
    // Supports prototyping
    // ONLY USE THIS FOR SANDBOX ENVIRONMENTS BY WHITELISTING CSP
    // Trusted Site Name: salesforce_heroku_data_faker
    // Trusted Site URL:	https://data-faker.herokuapp.com
    fetchFakeDataHelper,
    createSetFromDelimitedString,
    convertToSingleLineString,
    reduceErrors
};
