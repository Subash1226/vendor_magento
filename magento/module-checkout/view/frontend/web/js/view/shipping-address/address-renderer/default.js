define([
    'jquery',
    'ko',
    'uiComponent',
    'underscore',
    'Magento_Checkout/js/action/select-shipping-address',
    'Magento_Checkout/js/model/quote',
    'Magento_Checkout/js/model/shipping-address/form-popup-state',
    'Magento_Checkout/js/checkout-data',
    'Magento_Customer/js/customer-data'
], function ($, ko, Component, _, selectShippingAddressAction, quote, formPopUpState, checkoutData, customerData) {
    'use strict';

    var countryData = customerData.get('directory-data');

    return Component.extend({
        defaults: {
            template: 'Magento_Checkout/shipping-address/address-renderer/default'
        },

        /** @inheritdoc */
        initObservable: function () {
            this._super();
            this.isSelected = ko.computed(function () {
                var isSelected = false,
                    shippingAddress = quote.shippingAddress();

                if (shippingAddress) {
                    isSelected = shippingAddress.getKey() == this.address().getKey(); //eslint-disable-line eqeqeq
                }

                return isSelected;
            }, this);
            return this;
        },

        /**
         * @param {String} countryId
         * @return {String}
         */
        getCountryName: function (countryId) {
            return countryData()[countryId] != undefined ? countryData()[countryId].name : ''; //eslint-disable-line
        },

        /**
         * Get customer attribute label
         *
         * @param {*} attribute
         * @returns {*}
         */
        getCustomAttributeLabel: function (attribute) {
            var label;

            if (typeof attribute === 'string') {
                return attribute;
            }

            if (attribute.label) {
                return attribute.label;
            }

            if (_.isArray(attribute.value)) {
                label = _.map(attribute.value, function (value) {
                    return this.getCustomAttributeOptionLabel(attribute['attribute_code'], value) || value;
                }, this).join(', ');
            } else if (typeof attribute.value === 'object') {
                label = _.map(Object.values(attribute.value)).join(', ');
            } else {
                label = this.getCustomAttributeOptionLabel(attribute['attribute_code'], attribute.value);
            }

            return label || attribute.value;
        },

        /**
         * Get option label for given attribute code and option ID
         *
         * @param {String} attributeCode
         * @param {String} value
         * @returns {String|null}
         */
        getCustomAttributeOptionLabel: function (attributeCode, value) {
            var option,
                label,
                options = this.source.get('customAttributes') || {};

            if (options[attributeCode]) {
                option = _.findWhere(options[attributeCode], {
                    value: value
                });

                if (option) {
                    label = option.label;
                }
            } else if (value.file !== null) {
                label = value.file;
            }

            return label;
        },

        /** Set selected customer shipping address  */
        selectAddress: function () {
            selectShippingAddressAction(this.address());
            checkoutData.setSelectedShippingAddress(this.address().getKey());
        },

        /**
         * Edit address.
         */
        editAddress: function () {
            formPopUpState.isVisible(true);
            this.showPopup();
            this.populateFormWithAddress(this.address());
              },

        /**
         * Update address using AJAX.
         */
        updateAddress: function () {
            var address = this.address();
            var form = $('#co-shipping-form');
            var formData = form.serializeArray();
            var addressId = address.customerAddressId;

            if (!addressId) {
                return;
            }
            formData.push({name: 'address_id', value: addressId});

            $.ajax({
                url: '/home/index/UpdateAddress/id/' + addressId,
                type: 'POST',
                data: $.param(formData),
                showLoader: true,
                dataType: 'json',
                success: function (response) {
                    if (response.success) {
                        location.reload();
                        $('.action-close').click();
                    } else {
                        console.error('Failed to update address:', response.message);
                    }
                }.bind(this),
                error: function (xhr, status, error) {
                    console.error('Failed to update address:', error);
                }
            });
        },

        deleteAddress: function (addressId) {
            var addressItem = $('#address-' + addressId);
            var addressItems = $('.shipping-address-item');

            if (addressItems.length > 1) {
                if (confirm('Are you sure you want to delete this address?')) {
                    var deleteUrl = '/home/index/delete/id/' + addressId;
                    var NewAddress = $('#opc-new-shipping-address');
                    var Popup = $('.new-address-popup');

                    $.ajax({
                        url: deleteUrl,
                        type: 'POST',
                        showLoader: true,
                        dataType: 'json',
                        success: function (response) {
                            addressItem.remove();
                        },
                        error: function (xhr, status, error) {
                            console.error('AJAX Error:', error);
                        }
                    });
                }
            } else {
                alert('You cannot delete the last address.');
            }
        },

        /**
         * Show popup.
         */
        showPopup: function () {
            $('[data-open-modal="opc-new-shipping-address"]').trigger('click');
        },

        /**
         * Populate form fields with address data.
         */
        populateFormWithAddress: function (address) {
            $('.new-shipping-address-modal .modal-footer').hide();
            $('.action-update-address').show();
            var form = $('#co-shipping-form');
            var formFields = form.find('input, select, textarea');

            ko.utils.arrayForEach(formFields, function (field) {
                var fieldName = $(field).attr('name');
                console.log('Processing field:', fieldName);

                if (address.hasOwnProperty(fieldName)) {
                    if (fieldName === 'street[]' && Array.isArray(address.street)) {
                        console.log('Populating street address:', address.street);

                        address.street.forEach(function (streetLine, index) {
                            var streetField = form.find(`input[name="street[${index}]"]`);
                            if (streetField.length > 0) {
                                streetField.val(streetLine);
                                console.log(`Populating street[${index}]: ${streetLine}`);
                            } else {
                                var newStreetField = $('<input>')
                                    .attr('type', 'text')
                                    .attr('name', `street[${index}]`)
                                    .val(streetLine)
                                    .addClass('input-text');
                                form.append(newStreetField);
                                console.log(`Creating and populating new street[${index}]: ${streetLine}`);
                            }
                        });
                    } else {
                        $(field).val(address[fieldName]);
                        console.log(`Populating ${fieldName}: ${address[fieldName]}`);
                    }
                }
            });

            if ($('.action-update-address').length === 0) {
                var updateButton = $('<button/>', {
                    class: 'action primary action-update-address',
                    type: 'button',
                    'data-role': 'action',
                    text: 'Update Address',
                    click: this.updateAddress.bind(this)
                });
                form.append(updateButton);
            }
        },

    });
});
