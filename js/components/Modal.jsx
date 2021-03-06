'use strict';

var $ = require('jquery');
var AuthActionCreator = require('../actions/AuthActionCreator.js');
var ModalMixin = require('../mixins/BootstrapModalMixin.jsx');
var PubSub = require('pubsub-js');
var React = require('react');
var strings = require('../lib/strings_utils.js');

var Modal = React.createClass({
  mixins: [ModalMixin],

  getInitialState: function() {
    return {
      give: true,
      error: false,
      nudged: false,
      message: '',
      pending: false,
    };
  },

  componentWillReceiveProps: function(newProps) {
    if (this.props.user._id !== newProps.user._id) {
      this.setState({ give: true, error: false, message: '', nudged: false });
    }
  },

  // Validate a give
  validateAndGive: function(category, amount, anonymous) {

    // Validate that the expert really is an expert in this category
    var category;
    var categories = this.props.user.categories;
    var length = categories.length;
    for (var i = 0; i < length; i++) {
      if (categories[i].name === category) {
        category = categories[i];
        break;
      }
    }
    // If the category was not found, throw an error
    if (!category) {
      this.setState({ error: true, msg: strings.CATEGORY_NOT_FOUND(this.props.user.username) });
      return;
    }

    // Make sure the investor has enough reps
    if (this.props.currentUser.reps < amount) {
      this.setState({ error: true, message: strings.NOT_ENOUGH_REPS });
      return;
    }

    this.setState({error: null});
    this.createTransaction(this.props.user, this.props.currentUser,
      category.name, amount, anonymous);
  },


  validateAndRevoke: function(number, amount, anonymous) {
    var investmentList = this.getInvestmentList();
    var number = parseInt(number);
    var investment = investmentList[number-1].investment;
    var category = investmentList[number-1].category;

    // Make sure this investment has at least the amount
    if (investment.amount < amount) {
      this.setState({ error: true, message: strings.INVESTMENT_AMOUNT_TOO_SMALL(investment.amount) });
      return;
    }

    var id = investment._id;
    this.setState({error: null });
    this.createTransaction(this.props.user, this.props.currentUser,
      category, amount * -1, anonymous, id);
  },

  // Creates a transaction
  // Amount should be negative if revoke
  createTransaction: function(toUser, fromUser, category, amount, anonymous, investmentId) {
    var to = { "name": toUser.username, "id": toUser._id };
    var from = { "name": fromUser.username, "anonymous": anonymous, "id": fromUser._id };
    this.setState({ pending: true });
    $.ajax({
      url: '/api/transactions',
      type: 'POST',
      data: {
        to: to,
        from: from,
        category: category,
        amount: amount,
        anonymous: anonymous,
        id: investmentId,
      },
      success: function(transaction) {
        $.ajax({
          url: '/api/users/' + fromUser._id,
          type: 'GET',
          success: function(user) {
            var action = strings.SUCCESSFULLY_GAVE(transaction.amount, transaction.to.name);
            if (!this.state.give) {
              action = strings.SUCCESSFULLY_REVOKED(transaction.amount * -1, transaction.to.name);
            }
            this.setState({ error: false, message: action, pending: false });
            AuthActionCreator.getCurrentUser();
            PubSub.publish('profileupdate');
            PubSub.publish('userupdate');
          }.bind(this),
          error: function(xhr, status, err) {
            this.setState({ error: true, message: strings.ERROR_CREATING_TRANSACTION, pending: false });
            console.error(status, err.toString());
          }.bind(this),
        });
      }.bind(this),
      error: function(xhr, status, err) {
        this.setState({ error: true, message: strings.ERROR_CREATING_TRANSACTION, pending: false });
        console.error(status, err.toString());
      }.bind(this)
    });
  },

  handleSubmit: function(event) {
    event.preventDefault();
    var choice = this.refs.choice.getDOMNode().value;
    var anonymous = this.refs.anonymous.getDOMNode().checked;
    var amount = Number(this.refs.amount.getDOMNode().value);

    // Make sure a valid number was entered
    if (isNaN(amount)) {
      this.setState({ error: true, message: strings.INVALID_AMOUNT });
      return;
    }

    // Round the number to the nearest hundredth
    amount = Math.round(amount* 100) / 100;

    // Make sure the amount is not 0
    if (amount <= 0) {
      this.setState({ error: true, message: strings.INVALID_AMOUNT_VALUE  });
      return;
    }

    // Determine if we should give or revoke
    if (this.state.give) {
      this.validateAndGive(choice, amount, anonymous);
    } else {
      this.validateAndRevoke(choice, amount, anonymous);
    }
  },

  clickGive: function(e) {
    this.setState({ give: true });
  },

  clickRevoke: function(e) {
    this.setState({ give: false });
  },

  // Get all of the investments the currentUser has in this user
  getInvestmentList: function() {
    var investmentList = [];
    var length = this.props.currentUser.portfolio.length;
    var portfolio = this.props.currentUser.portfolio;
    for (var i = 0; i < length; i++) {
      var investments = portfolio[i].investments;
      var category = portfolio[i].category;
      var len = investments.length;
      for (var j = 0; j < len; j++) {
        if (investments[j].user === this.props.user.username) {
          investmentList.push({ investment: investments[j], category: category });
        }
      }
    }
    return investmentList;
  },

  // Get the rows for the investment table
  getInvestmentTableRows: function(investmentList) {
    var rows = [];
    var length = investmentList.length;
    var count = 1;
    for (var i = 0; i < length; i++) {
      rows.push(<tr key={investmentList[i]._id}>
        <td>{count}</td>
        <td>{investmentList[i].category}</td>
        <td>{investmentList[i].investment.amount}</td>
        <td>{investmentList[i].investment.dividend}</td>
      </tr>);
      count++;
    }
    return rows;
  },

  getInvestmentNumbers: function(investmentList) {
    var investmentNumbers = [];
    var length = investmentList.length;
    for (var i = 0; i < length; i++) {
      investmentNumbers.push(
        <option key={i+1} value={i+1}>{i+1}</option>
      );
    }
    return investmentNumbers;
  },

  // Get the list of categories for which the user can invest
  getInvestmentCategories: function() {
    var categories = this.props.user.categories;
    var categoriesList = [];
    for (var i = 0; i < categories.length; i++) {
      var key = categories[i].id;
      categoriesList.push(<option key={key} value={categories[i].name}>{categories[i].name}</option>);
    }
    return categoriesList;
  },

  sendNudge: function() {
    var user_id = this.props.currentUser._id;
    var user_id2 = this.props.user._id;
    $.ajax({
      url: '/api/users/' + user_id + '/nudge/' + user_id2,
      type: 'POST',
      success: function(msg) {
        this.setState({ error: false, message: msg, nudged: true });
      }.bind(this),
      error: function(xhr, status, err) {
        this.setState({ error: true, message: xhr.responseText });
        console.error(status, xhr.responseText);
      }.bind(this)
    });
  },

  render: function() {
    var revokeError = '';
    var modalStyleOverride = {
      'zIndex': 1050,
    };

    var modalContent = '';
    if (this.props.user.categories.length === 0) {
      var text = strings.USER_IS_NOT_EXPERT_IN_ANY_CATEGORIES(this.props.user.firstname);
      var nudge = '';
      if (!this.state.nudged) {
        nudge = <button onClick={this.sendNudge} className="btn btn-success nudge-btn">Tell {this.props.user.firstname} to add some expert categories!</button>;
      } else {
        nudge = <div className="nudge-success alert alert-success" role="alert">Sent request to {this.props.user.firstname}</div>;
      }
      modalContent =
        <div className="no-categories">
          {text}
          {nudge}
        </div>
    } else {
      var action = this.state.give ? 'Give' : 'Revoke'; // The text for the action button
      var actionBtn = <button type="submit" className="btn btn-lg btn-primary">{action}</button>;
      if (this.state.pending) {
        actionBtn = <div className="alert alert-info">Transaction pending...</div>;
      }

      var clazz = this.state.error ? 'alert alert-danger modal-msg' : 'alert alert-info modal-msg';
      var message = '';
      if (this.state.message.trim().length !== 0) {
        var message = <div className={clazz} role="alert">
            <p>{this.state.message}</p>
          </div>;
      }

      var investmentList = this.getInvestmentList(); // The list of investments
      var categories = this.getInvestmentCategories(); // The valid categories
      var investmentNumbers = this.getInvestmentNumbers(investmentList); // The investment numbers


      // Create the investment table if any investments exist
      var investmentTable = '';
      var investmentTableRows = this.getInvestmentTableRows(investmentList);
      if (investmentTableRows.length > 0) {
        investmentTable = (
          <table className="table table-bordered reps_table-nonfluid">
            <thead>
              <tr>
                <th>No.</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Dividend</th>
              </tr>
            </thead>
            <tbody>
              {investmentTableRows}
            </tbody>
          </table>
        );
      } else {
        if (!this.state.give) {
          var string = strings.NO_INVESTMENTS_TO_REVOKE;
          revokeError = <div className='modal-warning alert alert-info'>{string}</div>;
        }
      }

      // The dropdown box will be investment numbers or categories
      var choiceText = this.state.give ? 'Categories:' : 'Investment Number:';
      var choices = this.state.give ? categories : investmentNumbers;
      var choiceDropdown =
        <div className="choices-dropdown">
          <strong className="modal_text">{choiceText}</strong>
            <select ref="choice" className="form-control">
              {choices}
            </select>
            {revokeError}
        </div>;

      var amountPlaceholder = this.state.give ? strings.AMOUNT_TO_GIVE : strings.AMOUNT_TO_REVOKE;
      modalContent =
        <form onSubmit={this.handleSubmit} className="navbar-form">
          <div className="modal-body">
            <div className="row">
              <div className="btn-group giverevoke" role="group">
                <button type="button" ref="give" className="givebtn btn btn-default givebtn" onClick={this.clickGive}>Give</button>
                <button type="button" ref="revoke" className="revokebtn btn btn-default" onClick={this.clickRevoke}>Revoke</button>
              </div>
              <div className="anonymous">
                <strong>Anonymous</strong>: <input type="checkbox"
                  ref="anonymous" className="reps_checkbox" />
              </div>
            </div>
            <div className="row">
              <div className="menu-options">
                {choiceDropdown}
                <div className="reps-available">
                  <strong className="modal_text">Reps Available: </strong><p>{this.props.currentUser.reps}</p>
                </div>
                <div>
                  <strong className="modal_text">Amount:</strong>
                  <input type="text" placeholder={amountPlaceholder} className="form-control reps_text-input" ref="amount"/>
                </div>
              </div>
              <div className="investmentTable panel panel-default">
                {investmentTable}
              </div>
            </div>
            <div className="row">
              <div className="modal_submit">
                {actionBtn}
              </div>
            </div>
          </div>
        </form>;
    }

    return (
      <div className="modal reps_modal">
        <div className="modal-dialog investment-modal" style={modalStyleOverride}>
          <div className="modal-content">
            <div className="modal-header">
              {this.renderCloseButton()}
              <span><h3 className="modal-username">Invest in {this.props.user.username} </h3></span>
              {message}
            </div>
            {modalContent}
          </div>
        </div>
      </div>
    );
  }
});

module.exports = Modal;
