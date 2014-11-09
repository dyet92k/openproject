#-- encoding: UTF-8
#-- copyright
# OpenProject is a project management system.
# Copyright (C) 2012-2014 the OpenProject Foundation (OPF)
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License version 3.
#
# OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
# Copyright (C) 2006-2013 Jean-Philippe Lang
# Copyright (C) 2010-2013 the ChiliProject Team
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# See doc/COPYRIGHT.rdoc for more details.
#++
require File.expand_path('../../test_helper', __FILE__)

class DefaultDataTest < ActiveSupport::TestCase
  include Redmine::I18n

  def setup
    super
    delete_loaded_data!
    assert Redmine::DefaultData::Loader::no_data?
  end

  def test_no_data
    Redmine::DefaultData::Loader::load
    assert !Redmine::DefaultData::Loader::no_data?

    delete_loaded_data!
    assert Redmine::DefaultData::Loader::no_data?
  end

  def test_load
    valid_languages.each do |lang|
      begin
        delete_loaded_data!
        assert Redmine::DefaultData::Loader::load(lang)
        assert_not_nil IssuePriority.first
        assert_not_nil TimeEntryActivity.first
      rescue ActiveRecord::RecordInvalid => e
        assert false, ":#{lang} default data is invalid (#{e.message})."
      end
    end
  end

private

  def delete_loaded_data!
    Role.delete_all("builtin = 0")
    ::Type.delete_all("is_standard = false")
    Status.delete_all
    Enumeration.delete_all
  end
end
