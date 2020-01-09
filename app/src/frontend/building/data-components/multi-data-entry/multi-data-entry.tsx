import React, { Component, Fragment } from 'react';

import './multi-data-entry.css';

import { BaseDataEntryProps } from '../data-entry';
import { DataEntryInput, TextDataEntryInputProps } from '../data-entry-input';
import { DataTitleCopyable } from '../data-title';


interface MultiDataEntryProps extends BaseDataEntryProps, TextDataEntryInputProps {
    value: string[];
}

interface MultiDataEntryState {
    newValue: string;
}

class MultiDataEntry extends Component<MultiDataEntryProps, MultiDataEntryState> {

    constructor(props) {
        super(props);
        this.state = {
            newValue: null
        };
        
        this.setNewValue = this.setNewValue.bind(this);
        this.edit = this.edit.bind(this);
        this.addNew = this.addNew.bind(this);
        this.remove = this.remove.bind(this);
        this.getValues = this.getValues.bind(this);
    }

    getValues() {
        return this.props.value == undefined ? [] : this.props.value;
    }

    cloneValues() {
        return this.getValues().slice();
    }

    setNewValue(value: string) {
        this.setState({newValue: value});
    }

    edit(index: number, value: string) {
        let values = this.cloneValues();
        values.splice(index, 1, value);
        this.props.onChange(this.props.slug, values);
    }
    addNew(event) {
        event.preventDefault();
        if (this.state.newValue == undefined) return;
        const values = this.cloneValues().concat(this.state.newValue);
        this.setState({newValue: ''});
        this.props.onChange(this.props.slug, values);
    }

    remove(index: number){
        const values = this.cloneValues();
        values.splice(index, 1);
        this.props.onChange(this.props.slug, values);
    }

    render() {
        const values = this.getValues();
        const props = this.props;
        const isDisabled = props.mode === 'view' || props.disabled;
        return <Fragment>
            <DataTitleCopyable
                slug={props.slug}
                title={props.title}
                tooltip={props.tooltip}
                disabled={props.disabled || props.value == undefined || props.value.length === 0}
            />
            <div id={`${props.slug}-wrapper`}>
                <ul className="data-link-list">
                {
                    values.length === 0 &&
                    <div className="input-group">
                        <input className="form-control no-entries" type="text" value="No entries" disabled={true} />
                    </div>
                }
                {
                    values.map((val, i) => (
                        <li className="input-group" key={i /* i as key prevents input component recreation on edit */}>
                            <DataEntryInput
                                slug={props.slug}
                                name={`${props.slug}-${i}`}
                                id={`${props.slug}-${i}`}
                                value={val}
                                disabled={isDisabled}
                                onChange={(key, val) => this.edit(i, val)}

                                maxLength={props.maxLength}
                                valueTransform={props.valueTransform}
                                autofill={props.autofill}
                            />
                            {
                                !isDisabled &&
                                <div className="input-group-append">
                                    <button type="button" onClick={e => this.remove(i)}
                                        title="Remove"
                                        data-index={i} className="btn btn-outline-dark">✕</button>
                                </div>
                            }
                        </li>
                    ))
                }
                </ul>
                {
                    !isDisabled &&
                    <div className="input-group">
                        <DataEntryInput
                            slug={props.slug}
                            name={`${props.slug}`}
                            id={`${props.slug}`}
                            value={this.state.newValue}
                            disabled={props.disabled}
                            onChange={(key, val) => this.setNewValue(val)}

                            maxLength={props.maxLength}
                            placeholder={props.placeholder}
                            valueTransform={props.valueTransform}
                            autofill={props.autofill}
                        />
                        <div className="input-group-append">
                            <button type="button"
                                className="btn btn-outline-dark"
                                title="Add to list"
                                onClick={this.addNew}
                                disabled={this.state.newValue == undefined}
                            >+</button>
                        </div>
                    </div>
                }
            </div>
        </Fragment>;
    }
}

export default MultiDataEntry;