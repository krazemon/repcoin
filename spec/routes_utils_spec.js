process.env.NODE_ENV = 'test';
var utils = require('../api/routes/utils.js');
var urlConfig = require('../config/url.js');
var winston = require('winston');

var Category = require('../api/models/Category.js');
var Transaction = require('../api/models/Transaction.js');
var User = require('../api/models/User.js');

describe('Utils: ', function() {
  beforeEach(function() {
    spyOn(winston, 'log').andCallFake(function(arg1, arg2, arg3, arg4) {
      return;
    });
  });

  describe('getTotalDividends: ', function() {
    it('adds up the dividend from each investment', function() {
      var portfolioEntry = { investments: [ { dividend: 1 }, { dividend: 3 } ] };
      var totalDividends = utils.getTotalDividends(portfolioEntry);
      expect(totalDividends).toEqual(4);
    });

    it('returns 0 if the entry has no investments', function() {
      var portfolioEntry = {};
      var totalDividends = utils.getTotalDividends(portfolioEntry);
      expect(totalDividends).toEqual(0);
    });
  });

  describe('isExpert: ', function() {
    var user = { categories: [{ name: 'Coding' }] };
    it('returns true if the user is an expert', function() {
      var result = utils.isExpert(user, 'Coding');
      expect(result).toEqual(true);
    });

    it('returns false if the user is not an expert', function() {
      var result = utils.isExpert(user, 'Ballet');
      expect(result).toEqual(false);
    });
  });

  describe('isInvestor: ', function() {
    var user = { portfolio: [{ category: 'Coding' }] };
    it('returns true if the user is an investor', function() {
      var result = utils.isInvestor(user, 'Coding');
      expect(result).toEqual(true);
    });

    it('returns false if the user is not an investor', function() {
      var result = utils.isInvestor(user, 'Ballet');
      expect(result).toEqual(false);
    });
  });

  describe('getInvestorsExperts: ', function() {
    var user = {portfolio: [
      { category: 'Coding', investments: [
        { userId: 'foo' }, { userId: 'foo' }]}
    ]};

    it('returns investor\'s experts\' ids for a given categoryName', function() {
      var result = utils.getInvestorsExperts(user, 'Coding');
      expect(result).toEqual(['foo']);
    });

    it('returns an empty set when no experts are found', function() {
      var result = utils.getInvestorsExperts(user, 'Ballet');
      expect(result).toEqual({});
    });
  });

  describe('getInvestors: ', function() {
    var user = { categories: [{ name: 'Coding', investors: ['foo']}] };
    it('returns investors for a user categoryName', function() {
      var result = utils.getInvestors(user, 'Coding');
      expect(result).toEqual(['foo']);
    });

    it('returns null when no investors are found', function() {
      var result = utils.getInvestors(user, 'Ballet');
      expect(result).toEqual(null);
    });
  });

  describe('updateInvestorsExperts: ', function() {
    beforeEach(function() {
      cb = jasmine.createSpy();
    });

    var investors = [
      { id: '123' },
      { id: '456' }
    ];
    var users = [{ categories: [{ name: 'Coding', reps: 0, investors: investors }] }];
    it('properly removes investor', function() {
      spyOn(utils, 'saveAll').andCallFake(function(users, cb) {
        return cb([]);
      });
      spyOn(User, 'find').andCallFake(function(selector, cb) {
        return cb(null, users);
      });

      var expectedUsers = [{ categories: [{ name: 'Coding', reps: 0, investors: [{ id: '456' }] }] }];
      utils.updateInvestorsExperts(['foo'], 'Coding', '123', cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(utils.saveAll).toHaveBeenCalledWith(expectedUsers, jasmine.any(Function));
    });

    it('properly handles error from finding experts', function() {
      spyOn(User, 'find').andCallFake(function(selector, cb) {
        return cb('ERROR!', null);
      });

      utils.updateInvestorsExperts(['foo'], 'Coding', '123', cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('ERROR!');
    });

    it('properly handles error from saving investors', function() {
      spyOn(User, 'find').andCallFake(function(selector, cb) {
        return cb(null, users);
      });
      spyOn(utils, 'saveAll').andCallFake(function(users, cb) {
        return cb(['ERROR!']);
      });

      utils.updateInvestorsExperts(['foo'], 'Coding', '123', cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(['ERROR!']);
    });

    it('properly handles empty list of experts', function() {
      utils.updateInvestorsExperts([], 'Coding', '123', cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
    });
  });

  describe('reimburseInvestors: ', function() {
    beforeEach(function() {
      cb = jasmine.createSpy();
    });

    var investments = [
      { userId: '123', amount: 5 },
      { userId: '456', amount: 6 }
    ];
    var users = [{ portfolio: [{ category: 'Coding', reps: 0, investments: investments }] }];
    it('properly reimburses investors', function() {
      spyOn(utils, 'saveAll').andCallFake(function(users, cb) {
        return cb([]);
      });
      spyOn(User, 'find').andCallFake(function(selector, cb) {
        return cb(null, users);
      });
      var investors = [ { name: 'Foo', id: 'bar' }];

      var expectedUsers = [{ portfolio: [{ category: 'Coding', reps: 5, investments: [investments[1]] }] }];
      utils.reimburseInvestors(investors, 'Coding', '123', cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(utils.saveAll).toHaveBeenCalledWith(expectedUsers, jasmine.any(Function));
    });

    it('properly handles error from finding investors', function() {
      spyOn(User, 'find').andCallFake(function(selector, cb) {
        return cb('ERROR!', null);
      });

      var investors = [ { name: 'Foo', id: 'bar' }];
      utils.reimburseInvestors(investors, 'Coding', '123', cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('ERROR!');
    });

    it('properly handles error from saving investors', function() {
      spyOn(User, 'find').andCallFake(function(selector, cb) {
        return cb(null, users);
      });
      spyOn(utils, 'saveAll').andCallFake(function(users, cb) {
        return cb(['ERROR!']);
      });

      var investors = [ { name: 'Foo', id: 'bar' }];
      utils.reimburseInvestors(investors, 'Coding', '123', cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(['ERROR!']);
    });

    it('properly handles empty list of investors', function() {
      utils.reimburseInvestors([], 'Coding', '123', cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
    });
  });

  describe('removeInvestor: ', function() {
    it('properly removes the investor for the given category', function() {
      var investors = [
        { id: '123', name: 'Bob' },
        { id: '456', name: 'Matt' }
      ];
      var expert = { categories: [{ name: 'Coding', reps: 10, investors: investors }] };
      var result = utils.removeInvestor(expert, 'Coding', '123');
      var expected = { categories: [{ name: 'Coding', reps: 10, investors: [investors[1]] }] };
      expect(result).toEqual(expected);
    });
  });

  describe('reimburseInvestor: ', function() {
    it('properly reimburses investments pertaining to this user and category', function() {
      var investments = [
        { userId: '123', amount: 5 },
        { userId: '456', amount: 6 }
      ];
      var investor = { portfolio: [{ category: 'Coding', reps: 0, investments: investments }] };
      var result = utils.reimburseInvestor(investor, 'Coding', '123');
      var expected = { portfolio: [{ category: 'Coding', reps: 5, investments: [investments[1]] }] };
      expect(result).toEqual(expected);
    });
  });

  describe('deleteInvestorCategory: ', function() {
    it('deletes the category from the portfolio and gives back reps', function() {
      var user = { reps: 10, portfolio: [{ category: 'Coding', investments: [ { amount: 5 } ]  }] };
      var result = utils.deleteInvestorCategory(user, 'Coding');
      expect(result).toEqual({ reps: 15, portfolio: [] });
    });
  });

  describe('deleteExpertCategory: ', function() {
    it('deletes the category from the expert categories', function() {
      var user = { categories: [{ name: 'Coding' }] };
      var result = utils.deleteExpertCategory(user, 'Coding');
      expect(result).toEqual({ categories: [] });
    });

    it('resets the defaultCategory if it was the deleted category', function() {
      var user = { defaultCategory: 'Coding', categories: [{ name: 'Coding' }] };
      var result = utils.deleteExpertCategory(user, 'Coding');
      expect(result).toEqual({ defaultCategory: undefined, categories: [] });
    });
  });

  describe('validateUserLinks: ', function() {
    it('returns true if inputs are correct', function() {
      var links = [{ title: 'foo', url: 'bar' }];
      var result = utils.validateUserLinks(links);
      expect(result).toEqual(true);
    });

    it('returns false if a title is incorrect', function() {
      var links = [{ title: '', url: 'bar' }];
      var result = utils.validateUserLinks(links);
      expect(result).toEqual(false);

      links = [{ url: 'bar' }];
      result = utils.validateUserLinks(links);
      expect(result).toEqual(false);
    });

    it('returns false if a url is incorrect', function() {
      var links = [{ title: 'foo', url: '' }];
      var result = utils.validateUserLinks(links);
      expect(result).toEqual(false);

      links = [{ title: 'foo' }];
      result = utils.validateUserLinks(links);
      expect(result).toEqual(false);
    });

    it('returns true if links are meant to be empty', function() {
      var links = ['EMPTY'];
      var result = utils.validateUserLinks(links);
      expect(result).toEqual(true);
    });
  });

  describe('validateUserInputs: ', function() {
    it('returns true if inputs are correct', function() {
      var req = { body: { about: 'Hello!' }};
      var result = utils.validateUserInputs(req);
      expect(result).toEqual(true);
    });

    it('returns false if about is incorrect', function() {
      var req = { body: { about: '    ' }};
      var result = utils.validateUserInputs(req);
      expect(result).toEqual(false);
    });

    it('returns false if picture is incorrect', function() {
      var req = { body: { about: 'Hello!', picture: { url: 'foo'} }};
      var result = utils.validateUserInputs(req);
      expect(result).toEqual(false);
    });

  });

  describe('validateTransactionInputs: ', function() {
    var req;
    beforeEach(function() {
      req = { body : {
        from      : { id: '1', name: 'foo' },
        to        : { id: '2', name: 'bar' },
        amount    : 10,
        category  : 'foo'
      }};
    });

    it('returns true if inputs are correct', function() {
      var result = utils.validateTransactionInputs(req);
      expect(result).toEqual(true);
    });

    it('returns false is amount is 0', function() {
      req.body.amount = 0;
      var result = utils.validateTransactionInputs(req);
      expect(result).toEqual(false);
    });

    it('returns false if amount is past hundredths place', function() {
      req.body.amount = 10.152;
      var result = utils.validateTransactionInputs(req);
      expect(result).toEqual(false);
    });

    it('returns false is amount is not a number', function() {
      req.body.amount = 'foo';
      var result = utils.validateTransactionInputs(req);
      expect(result).toEqual(false);
    });

    it('returns false if no id is supplied for a revoke', function() {
      req.body.amount = -1;
      var result = utils.validateTransactionInputs(req);
      expect(result).toEqual(false);
    });

  });

  describe('updateExpertPercentiles: ', function() {
    beforeEach(function() {
      cb = jasmine.createSpy();
    });
    var category = 'Coding';
    var expertsPromise = {
      experts: [
        { _id: '1', categories: [ { name: category, reps: 9, percentile: 50 }] },
        { _id: '2', categories: [ { name: category, reps: 1, percentile: 50 }] },
        { _id: '3', categories: [ { name: category, reps: 8, percentile: 50 }] },
        { _id: '4', categories: [ { name: category, reps: 5, percentile: 50 }] },
      ],

      then: function(cb) {
        return cb(this.experts);
      }
    };

    it('should correctly update percentiles for some experts', function() {
      spyOn(User, 'findExpertByCategory').andReturn(expertsPromise);
      spyOn(utils, 'saveAll').andCallFake(function(experts, cb) {
        return cb([]);
      });
      spyOn(utils, 'getExpertPercentiles').andCallFake(function(experts, category, cb) {
        return cb(null);
      });
      utils.updateExpertPercentiles(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
    });

    it('should correctly handle error from getExpertPercentiles', function() {
      spyOn(User, 'findExpertByCategory').andReturn(expertsPromise);
      spyOn(utils, 'saveAll').andCallFake(function(experts, cb) {
        return cb([]);
      });
      spyOn(utils, 'getExpertPercentiles').andCallFake(function(experts, category, cb) {
        return cb('getExpertPercentile error');
      });
      utils.updateExpertPercentiles(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('getExpertPercentile error');
    });

    it('should correctly handle error from saveAll()', function() {
      spyOn(User, 'findExpertByCategory').andReturn(expertsPromise);
      var errs = ['Error from saveAll()'];
      spyOn(utils, 'saveAll').andCallFake(function(experts, cb) {
        return cb(errs);
      });
      spyOn(utils, 'getExpertPercentiles').andCallFake(function(experts, category, cb) {
        return cb(null);
      });
      utils.updateExpertPercentiles(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(errs);
    });
  });

  describe('updateInvestors: ', function() {
    beforeEach(function() {
      cb = jasmine.createSpy();
    });

    var category = 'Coding';
    var investorsPromise = {
      investors: [
        { _id: '1', portfolio: [ { category: category, percentile: 50, investments: [{ dividend: 1 }] }] },
        { _id: '2', portfolio: [ { category: category, percentile: 50, investments: [{ dividend: 1 }] }] },
        { _id: '3', portfolio: [ { category: category, percentile: 50, investments: [{ dividend: 1 }] }] },
        { _id: '4', portfolio: [ { category: category, percentile: 50, investments: [{ dividend: 1 }] }] },
      ],

      then: function(cb) {
        return cb(this.investors);
      }
    };

    it('should call updateDividends when parameters are provided', function() {
      spyOn(utils, 'updateDividends')
        .andCallFake(function(investors, toUserCategoryTotal, category, username) {
          return investors;
        });
      spyOn(User, 'findInvestorByCategory').andReturn(investorsPromise);
      spyOn(utils, 'saveAll').andCallFake(function(investors, cb) {
        return cb([]);
      });
      spyOn(utils, 'updateInvestorPercentiles').andCallFake(function(investors, category, cb) {
        return cb(null);
      });
      utils.updateInvestors(category, cb, 100, 'Coding', 'Matt');
      expect(utils.updateDividends.callCount).toEqual(1);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
    });

    it('should correctly update percentiles for some investors', function() {
      spyOn(utils, 'updateDividends')
        .andCallFake(function(investors, toUserCategoryTotal, category, username) {
          return investors;
        });
      spyOn(User, 'findInvestorByCategory').andReturn(investorsPromise);
      spyOn(utils, 'saveAll').andCallFake(function(investors, cb) {
        return cb([]);
      });
      spyOn(utils, 'updateInvestorPercentiles').andCallFake(function(investors, category, cb) {
        return cb(null);
      });
      utils.updateInvestors(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
    });

    it('should correctly handle error from updateInvestorPercentiles', function() {
      spyOn(utils, 'updateDividends')
        .andCallFake(function(investors, toUserCategoryTotal, category, username) {
          return investors;
        });
      spyOn(User, 'findInvestorByCategory').andReturn(investorsPromise);
      spyOn(utils, 'saveAll').andCallFake(function(investors, cb) {
        return cb([]);
      });
      spyOn(utils, 'updateInvestorPercentiles').andCallFake(function(investors, category, cb) {
        return cb('getInvestorPercentile error');
      });
      utils.updateInvestors(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('getInvestorPercentile error');
    });

    it('should correctly handle error from saveAll()', function() {
      spyOn(utils, 'updateDividends')
        .andCallFake(function(investors, toUserCategoryTotal, category, username) {
          return investors;
        });
      spyOn(User, 'findInvestorByCategory').andReturn(investorsPromise);
      var errs = ['Error from saveAll()'];
      spyOn(utils, 'saveAll').andCallFake(function(investors, cb) {
        return cb(errs);
      });
      spyOn(utils, 'updateInvestorPercentiles').andCallFake(function(investors, category, cb) {
        return cb(null);
      });
      utils.updateInvestors(category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(errs);
    });
  });

  describe('dividendsComparator: ', function() {
    it('should correctly sort users by dividends in increasing order', function() {
      var users = [
        { _id: '1', portfolio: [ { category: 'Coding', investments: [{ dividend: 3 }] }] },
        { _id: '2', portfolio: [ { category: 'Coding', investments: [{ dividend: 5 }] }] },
        { _id: '3', portfolio: [ { category: 'Coding', investments: [{ dividend: 3 }] }] },
        { _id: '4', portfolio: [ { category: 'Coding', investments: [{ dividend: 1 }] }] },
      ];

      var expected = [
        { _id: '4', portfolio: [ { category: 'Coding', investments: [{ dividend: 1 }] }] },
        { _id: '1', portfolio: [ { category: 'Coding', investments: [{ dividend: 3 }] }] },
        { _id: '3', portfolio: [ { category: 'Coding', investments: [{ dividend: 3 }] }] },
        { _id: '2', portfolio: [ { category: 'Coding', investments: [{ dividend: 5 }] }] },
      ];

      var dividendsComparator = utils.getDividendsComparator('Coding');
      var results = users.sort(dividendsComparator);
      expect(results.length).toEqual(4);
      expect(results).toEqual(expected);
    });
  });

  describe('percentileComparator: ', function() {
    it('should correctly sort users by expert percentile in decreasing order if expert', function() {
      var users = [
        { _id: '1', categories: [{ name: 'Coding', percentile: 3 }] },
        { _id: '2', categories: [{ name: 'Coding', percentile: 5 }] },
        { _id: '3', categories: [{ name: 'Coding', percentile: 3 }] },
        { _id: '4', categories: [{ name: 'Coding', percentile: 1 }] },
      ];

      var expected = [
        { _id: '2', categories: [{ name: 'Coding', percentile: 5 }] },
        { _id: '1', categories: [{ name: 'Coding', percentile: 3 }] },
        { _id: '3', categories: [{ name: 'Coding', percentile: 3 }] },
        { _id: '4', categories: [{ name: 'Coding', percentile: 1 }] },
      ];

      var percentileComparator = utils.getPercentileComparator('Coding', true);
      var results = users.sort(percentileComparator);
      expect(results.length).toEqual(4);
      expect(results).toEqual(expected);
    });

    it('should correctly sort users by investor percentile in decreasing order if not expert', function() {
      var users = [
        { _id: '1', portfolio: [{ category: 'Coding', percentile: 3 }] },
        { _id: '2', portfolio: [{ category: 'Coding', percentile: 5 }] },
        { _id: '3', portfolio: [{ category: 'Coding', percentile: 3 }] },
        { _id: '4', portfolio: [{ category: 'Coding', percentile: 1 }] },
      ];

      var expected = [
        { _id: '2', portfolio: [{ category: 'Coding', percentile: 5 }] },
        { _id: '1', portfolio: [{ category: 'Coding', percentile: 3 }] },
        { _id: '3', portfolio: [{ category: 'Coding', percentile: 3 }] },
        { _id: '4', portfolio: [{ category: 'Coding', percentile: 1 }] },
      ];

      var percentileComparator = utils.getPercentileComparator('Coding', false);
      var results = users.sort(percentileComparator);
      expect(results.length).toEqual(4);
      expect(results).toEqual(expected);
    });
  });

  describe('repsComparator: ', function() {
    it('should correctly sort users by reps in increasing order', function() {
      var users = [
        { _id: '1', categories: [{ name: 'Coding', reps: 3 }] },
        { _id: '2', categories: [{ name: 'Coding', reps: 5 }] },
        { _id: '3', categories: [{ name: 'Coding', reps: 3 }] },
        { _id: '4', categories: [{ name: 'Coding', reps: 1 }] },
      ];

      var expected = [
        { _id: '4', categories: [{ name: 'Coding', reps: 1 }] },
        { _id: '1', categories: [{ name: 'Coding', reps: 3 }] },
        { _id: '3', categories: [{ name: 'Coding', reps: 3 }] },
        { _id: '2', categories: [{ name: 'Coding', reps: 5 }] },
      ];

      var repsComparator = utils.getRepsComparator('Coding');
      var results = users.sort(repsComparator);
      expect(results.length).toEqual(4);
      expect(results).toEqual(expected);
    });
  });

  describe('updateInvestorPercentiles: ', function() {
    var investors, category, cb;
    beforeEach(function() {
      cb = jasmine.createSpy();
    });

    it('should give all investors a percentile of 50 if dividends are the same', function() {
      category = 'Coding';
      investors = [
        { _id: '1', portfolio: [ { category: category, investments: [{ dividend: 1 }] }] },
        { _id: '2', portfolio: [ { category: category, investments: [{ dividend: 1 }] }] },
      ];

      utils.updateInvestorPercentiles(investors, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(investors[0].portfolio[0].percentile).toEqual(50);
      expect(investors[1].portfolio[0].percentile).toEqual(50);
    });

    it('should give all investors correct percentiles if dividends are different', function() {
      category = 'Coding';
      investors = [
        { _id: '1', portfolio: [ { category: category, investments: [{ dividend: 1 }] }] },
        { _id: '2', portfolio: [ { category: category, investments: [{ dividend: 2 }] }] },
        { _id: '3', portfolio: [ { category: category, investments: [{ dividend: 3 }] }] },
        { _id: '4', portfolio: [ { category: category, investments: [{ dividend: 4 }] }] },
      ];

      utils.updateInvestorPercentiles(investors, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(investors[0].portfolio[0].percentile).toEqual(12);
      expect(investors[1].portfolio[0].percentile).toEqual(37);
      expect(investors[2].portfolio[0].percentile).toEqual(62);
      expect(investors[3].portfolio[0].percentile).toEqual(87);
    });

    it('should give a single investor a percentile of 50', function() {
      category = 'Coding';
       var investments = [ { amount: 10 } ];

      investors = [
        { _id: '1', portfolio: [ { category: category, investments: [] }] },
      ];

      utils.updateInvestorPercentiles(investors, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(investors[0].portfolio[0].percentile).toEqual(50);
    });

    it('should return an error if the first investor does not have the category', function() {
      category = 'Coding';
      investors = [
        { _id: '1', portfolio: [ { category: 'A', investments: [] }], username: 'Matt Ritter' },
      ];
      utils.updateInvestorPercentiles(investors, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('Could not find portfolio index for user Matt Ritter');
    });

    it('should return an error if any investor does not have the category', function() {
      category = 'Coding';
      investors = [
        { _id: '1', username: 'Matt Ritter', portfolio: [ { category: category, investments: [] }], },
        { _id: '2', username: 'Bob', portfolio: [ { category: 'A', investments: [] }] },
      ];

      utils.updateInvestorPercentiles(investors, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('Could not find portfolio index for user Bob');
    });
  });

  describe('getExpertPercentiles: ', function() {
    var experts, category, cb;

    beforeEach(function() {
      cb = jasmine.createSpy();
    });

    it('should give all experts a percentile of 50 if reps are the same', function() {
      category = 'Coding';
      experts = [
        { _id: '1', categories: [ { name: category, reps: 10 }] },
        { _id: '2', categories: [ { name: category, reps: 10 }] },
      ];
      utils.getExpertPercentiles(experts, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(experts[0].categories[0].percentile).toEqual(50);
      expect(experts[1].categories[0].percentile).toEqual(50);
    });

    it('should give all experts correct percentiles if reps are different', function() {
      category = 'Coding';
      experts = [
        { _id: '1', categories: [ { name: category, reps: 10 }] },
        { _id: '2', categories: [ { name: category, reps: 12 }] },
        { _id: '3', categories: [ { name: category, reps: 14 }] },
        { _id: '4', categories: [ { name: category, reps: 16 }] },
      ];
      utils.getExpertPercentiles(experts, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(experts[0].categories[0].percentile).toEqual(12);
      expect(experts[1].categories[0].percentile).toEqual(37);
      expect(experts[2].categories[0].percentile).toEqual(62);
      expect(experts[3].categories[0].percentile).toEqual(87);
    });

    it('should give a single expert a percentile of 50', function() {
      category = 'Coding';
      experts = [
        { _id: '1', categories: [ { name: category, reps: 10 }] },
      ];
      utils.getExpertPercentiles(experts, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith(null);
      expect(experts[0].categories[0].percentile).toEqual(50);
    });

    it('should return an error if the first expert does not have the category', function() {
      category = 'Coding';
      experts = [
        { _id: '1', username: 'Matt Ritter', categories: [] },
      ];
      utils.getExpertPercentiles(experts, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('Could not find category index for user Matt Ritter');
    });

    it('should return an error if any expert does not have the category', function() {
      category = 'Coding';
      experts = [
        { _id: '1', username: 'Matt Ritter', categories: [{ name: category, reps: 10 }] },
        { _id: '2', username: 'Bob', categories: [] },
      ];
      utils.getExpertPercentiles(experts, category, cb);
      expect(cb.callCount).toEqual(1);
      expect(cb).toHaveBeenCalledWith('Could not find category index for user Bob');
    });
  });

  describe('removeInvestorFromExpertOnRevoke', function() {
    var expert = { _id: '123' };
    var investorId = '456'
    beforeEach(function() {
      spyOn(utils, 'removeInvestor').andReturn();
    });

    it('returns does not change the expert if the investor still has investments', function() {
      var portfolioEntry = { investments: [ { userId: '123' } ] };
      utils.removeInvestorFromExpertOnRevoke(expert, investorId, portfolioEntry);
      expect(utils.removeInvestor.callCount).toEqual(0);
    });

    it('call to remove investor', function() {
      var portfolioEntry = { investments: [] };
      utils.removeInvestorFromExpertOnRevoke(expert, investorId, portfolioEntry);
      expect(utils.removeInvestor.callCount).toEqual(1);
    });
  });

  describe('updateInvestorPortfolio', function() {
    var fromUser, category, toUser, amount, toUserCategoryTotal;

    it('should return null if the user is not an investor for this category', function() {
      fromUser = { portfolio: [{ category: 'Ballet' }] };
      category = 'Coding';
      var result = utils.updateInvestorPortfolio(fromUser, toUser, category, amount, toUserCategoryTotal);
      expect(result).toEqual(null);
    });

    it('should return null if revoking from a non-existent investment', function() {
      fromUser = { portfolio: [{ category: 'Coding', investments: [] }] };
      category = 'Coding';
      amount = -1;
      var result = utils.updateInvestorPortfolio(fromUser, toUser, category, amount, toUserCategoryTotal);
      expect(result).toEqual(null);
    });

    it('should add user to the portfolio if investment is a give', function() {
      fromUser = { reps: 100, portfolio: [{ category: 'Coding', investments: [] }] };
      amount = 10;
      toUserCategoryTotal = 20;
      toUser = { _id: '123', username: 'Matt' };

      var user = utils.updateInvestorPortfolio(fromUser, toUser, category, amount, toUserCategoryTotal);
      var newInvestment = { user: 'Matt', userId: '123', amount: 10, percentage: 0.50, dividend: 1 };
      expect(user.portfolio[0].investments).toEqual([newInvestment]);
      expect(user.reps).toEqual(90);
    });

    it('should update the existing investment and dividend if revoke', function() {
      var existingInvestment = { _id: '1', user: 'Matt', userId: '123', amount: 10, percentage: 0.1, dividend: 10 };
      var fromUser = { reps: 100, portfolio: [{ category: 'Coding', investments: [existingInvestment] }] };
      amount = -2;
      toUserCategoryTotal = 998;
      toUser = { id: '123', name: 'Matt' };
      var id = '1';
      var user = utils.updateInvestorPortfolio(fromUser, toUser, category, amount, toUserCategoryTotal, id);

      expect(user.portfolio[0].investments.length).toEqual(1);
      expect(user.portfolio[0].investments[0].amount).toEqual(8);
      expect(user.portfolio[0].investments[0].percentage).toEqual(0.08);
      expect(user.portfolio[0].investments[0].dividend).toEqual(7.98);
      expect(user.reps).toEqual(102);
    });

    it('should remove the investment if it is entirely revoked', function() {
      var investment = { _id: '1', user: "Matt", userId: "123", amount: 10, dividend: 1, percentage: 10 };
      var investment2 = { _id: '2', user: "Bob", userId: "456", amount: 10, dividend: 1, percentage: 10 };
      var investment3 = { _id: '3', user: "Matt", userId: "123", amount: 10, dividend: 1, percentage: 10 };
      var fromUser = { reps: 100, portfolio: [{ category: "Coding", roi: { value: 0, length: 0 }, investments: [investment, investment2, investment3] }] };
      amount = -10;
      toUserCategoryTotal = 990;
      toUser = { id: '123', name: 'Matt' };
      var id = '1';
      spyOn(utils, 'removeInvestorFromExpertOnRevoke').andReturn();

      var user = utils.updateInvestorPortfolio(fromUser, toUser, category, amount, toUserCategoryTotal, id);
      expect(user.portfolio[0].investments.length).toEqual(2);
      expect(user.portfolio[0].investments[0]._id).toEqual('2');
      expect(user.reps).toEqual(110);
    });
  });

  describe('addInvestorToExpertCategory', function() {
    var investorName = 'Bob';
    var investorId = '123';
    var i, categories, expert, investors;

    it('should return the expert unchanged if the investor was present', function() {
      investors = [{ name: 'Bob', id: '123' }];
      categories = [{ name: 'Coding', investors: investors }];
      expert = { categories: categories };
      i = 0;
      var e = utils.addInvestorToExpertCategory(expert, investorId, investorName, i);
      expect(e.categories[i].investors).toEqual(investors);
    });

    it('should add the investor to the category if the investor was not present', function() {
      categories = [{ name: 'Coding', investors: [] }];
      expert = { categories: categories };
      i = 0;
      var e = utils.addInvestorToExpertCategory(expert, investorId, investorName, i);
      expect(e.categories[i].investors).toEqual([{ name: 'Bob', id: '123' }]);
    });
  });

  describe('getCategoryIndex: ', function() {
    var categories = [
      { name: 'Ballet' },
      { name: 'Coding' },
    ];

    var expert = { categories: categories };
    it('should return the index of the category if present', function() {
      var i = utils.getCategoryIndex(expert, 'Coding');
      expect(i).toEqual(1);
    });

    it('should return -1 when the category is not present', function() {
      var i = utils.getCategoryIndex(expert, 'Foo');
      expect(i).toEqual(-1);
    });

    it('should return -1 if the expert has no categories', function() {
      var emptyExpert = { categories: [] };
      var i = utils.getCategoryIndex(emptyExpert, 'Coding');
      expect(i).toEqual(-1);
    });
  });

  describe('getPortfolioIndex: ', function() {
    var portfolio = [
      { category: 'Ballet' },
      { category: 'Coding' },
    ];

    var investor = { portfolio: portfolio };
    it('should return the index of the category if present', function() {
      var i = utils.getPortfolioIndex(investor, 'Coding');
      expect(i).toEqual(1);
    });

    it('should return -1 when the category is not present', function() {
      var i = utils.getPortfolioIndex(investor, 'Foo');
      expect(i).toEqual(-1);
    });

    it('should return -1 if the investor has no categories', function() {
      var emptyInvestor = { portfolio: [] };
      var i = utils.getPortfolioIndex(emptyInvestor, 'Coding');
      expect(i).toEqual(-1);
    });
  });

  describe('updateDividends', function() {
    it('should correctly update dividends', function() {
      var category = 'Coding';
      var expertCategoryTotal = 100;
      var username = 'Matt';

      var investment1 = { user: 'Matt', userId: '123', amount: 8, percentage: 0.20, dividend: 1 };
      var investment2 = { user: 'Matt', userId: '123', amount: 5, percentage: 0.15, dividend: 1 };
      var investment3 = { user: 'Matt', userId: '123', amount: 20, percentage: 0.10, dividend: 1 };
      var investment4 = { user: 'Bob', userId: '456', amount: 10, percentage: 0.14, dividend: 1 };

      var investors = [
        { _id: '1', portfolio: [ { category: category, investments: [investment1] }] },
        { _id: '2', portfolio: [ { category: category, investments: [investment2] }] },
        { _id: '3', portfolio: [ { category: category, investments: [investment3] }] },
        { _id: '4', portfolio: [ { category: category, investments: [investment4] }] },
      ];

      var result1 = { user: 'Matt', userId: '123', amount: 8, percentage: 0.20, dividend: 2 };
      var result2 = { user: 'Matt', userId: '123', amount: 5, percentage: 0.15, dividend: 1.5 };
      var result3 = { user: 'Matt', userId: '123', amount: 20, percentage: 0.10, dividend: 1 };
      var result4 = { user: 'Bob', userId: '456', amount: 10, percentage: 0.14, dividend: 1 };

      var expectedInvestors = [
        { _id: '1', portfolio: [ { category: category, investments: [result1] }] },
        { _id: '2', portfolio: [ { category: category, investments: [result2] }] },
        { _id: '3', portfolio: [ { category: category, investments: [result3] }] },
        { _id: '4', portfolio: [ { category: category, investments: [result4] }] },
      ];

      var results = utils.updateDividends(investors, expertCategoryTotal, category, username);
      for (var i = 0; i < results.length; i++) {
        expect(results[i]).toEqual(expectedInvestors[i]);
      }
    });
  });

  describe('saveAll: ', function() {
    beforeEach(function() {
      jasmine.Clock.useMock();
      saveLogic = jasmine.createSpy();
      mainCB = jasmine.createSpy();
    });

    it('should simply return if there are 0 docs passed in', function() {
      var docs = [];
      utils.saveAll(docs, mainCB);
      expect(mainCB.callCount).toEqual(1);
      expect(mainCB).toHaveBeenCalledWith([]);
    });

    it('should not call the callback until the docs have been saved', function() {
      var mockSave = function(cb) {
        setTimeout(function() {
          saveLogic();
          cb();
        }, 100);
      };

      docs = [
        {save: mockSave},
        {save: mockSave},
      ];

      utils.saveAll(docs, mainCB);

      expect(saveLogic.callCount).toEqual(0);
      expect(mainCB.callCount).toEqual(0);

      jasmine.Clock.tick(101);

      expect(saveLogic.callCount).toEqual(2);
      expect(mainCB.callCount).toEqual(1);
      expect(mainCB).toHaveBeenCalledWith([]);
    });

    it('should accumulate errors and pass them to the callback', function() {
      var i = 0;
      var errors = ['1', '2'];
      var mockSave = function(cb) {
        setTimeout(function() {
          saveLogic();
          cb(errors[i]);
          i++;
        }, 100);
      };

      docs = [
        {save: mockSave},
        {save: mockSave},
      ];

      utils.saveAll(docs, mainCB);
      jasmine.Clock.tick(101);

      expect(mainCB).toHaveBeenCalledWith(['1', '2']);
    });
  });

  describe('generateVerificationToken', function() {
    it('should generate a verification token with length 24', function() {
      expect(utils.generateVerificationToken().length).toEqual(24);
    });

    it ('should generate unique tokens', function() {
      expect(utils.generateVerificationToken()).not.toEqual(utils.generateVerificationToken());
    });
  });

  describe('generateVerificationEmailOptions', function() {
    it('should add the url to the text', function() {
      expect(utils.generateVerificationEmailOptions('test@test.com', 'test')).toEqual({
        from: jasmine.any(String),
        to: 'test@test.com',
        subject: jasmine.any(String),
        text:
          'Hi!\n\n Please confirm your new account for Repcoin by clicking ' +
          'this URL: ' + urlConfig[process.env.NODE_ENV] + '#/verify/test/' +
          ' \n\n\n Thanks,\nThe Repcoin Team',

      });
    });
  });

  describe('createEvent', function() {
    beforeEach(function() {
      spyOn(utils, 'createJoinEvent').andCallFake(function(name, id) {
        return [name, id];
      });
    });

    it('should call create join event', function() {
      utils.createEvent('join', ['foo', 'bar']);
      expect(utils.createJoinEvent).toHaveBeenCalledWith('foo', 'bar');
    });
  });

});
