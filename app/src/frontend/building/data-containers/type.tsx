import React, { Fragment } from 'react';

import withCopyEdit from '../data-container';
import SelectDataEntry from '../data-components/select-data-entry';
import NumericDataEntry from '../data-components/numeric-data-entry';
import DataEntry from '../data-components/data-entry';
import { dataFields } from '../../data_fields';

const AttachmentFormOptions = [
    "Detached",
    "Semi-Detached",
    "End-Terrace",
    "Mid-Terrace"
];

/**
* Type view/edit section
*/
const TypeView = (props) => {
    const {mode, copy, onChange} = props;
    const dataEntryProps = { mode, copy, onChange };

    return (
        <Fragment>
            <SelectDataEntry
                title={dataFields.building_attachment_form.title}
                slug="building_attachment_form"
                value={props.building.building_attachment_form}
                tooltip={dataFields.building_attachment_form.tooltip}
                options={AttachmentFormOptions}
                {...dataEntryProps}
            />
            <NumericDataEntry
                title={dataFields.date_change_building_use.title}
                slug="date_change_building_use"
                value={props.building.date_change_building_use}
                tooltip={dataFields.date_change_building_use.tooltip}
                min={1086}
                max={new Date().getFullYear()}
                step={1}
                {...dataEntryProps}
            />
            <DataEntry
                title={dataFields.original_building_use.title}
                slug="original_building_use" // doesn't exist in database yet
                tooltip={dataFields.original_building_use.tooltip}
                disabled={true}
            />
        </Fragment>
    );
    }
const TypeContainer = withCopyEdit(TypeView);

export default TypeContainer;
