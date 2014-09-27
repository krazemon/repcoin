/** @jsx React.DOM */
"use strict";

var React = require('react');
var Feed = require('./Feed.jsx');

var FeedHeader = React.createClass({
  render: function() {
    return (
      <div className = "feedHeader">
        <input type="button" value="All"/>
        <input type="button" value="To"/>
        <input type="button" value="From"/>
        <input type="button" value = "Us"/>
      </div>
    );
  }
});

module.exports = FeedHeader;
