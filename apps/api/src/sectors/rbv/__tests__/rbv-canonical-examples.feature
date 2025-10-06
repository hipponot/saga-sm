Feature: Bladensburg Schedule Canonical Examples
  As a school administrator at Bladensburg High School
  I want to upload my bell schedule
  So that I can get the meeting times for an arbitrary day

  Background:
    Given Bell Schedule Groupings:
      | name |
      |  1A  |
      |  2A  |
      |  3A  |
      |  4A  |
      |  1B  |
      |  2B  |
      |  3B  |
      |  4B  |
    And Bell Schedule Days:
      | name  | groups         |
      | A Day | 1A, 2A, 3A, 4A |
      | B Day | 1B, 2B, 3B, 4B |
    And a "Normal" variant with time slots:
      | period | start      | end      |
      | 1      | 09:30      | 10:48    |
      | 2      | 10:55      | 13:20    |
      | 3      | 13:27      | 14:45    |
      | 4      | 14:52      | 16:10    |
    And a second "Two Hour Delay" variant with time slots:
      | period | start      | end      |
      | 1      | 13:59      | 14:36    |
      | 2      | 11:30      | 13:52    |
      | 3      | 14:43      | 15:23    |
      | 4      | 15:29      | 16:10    |
    And the days alternate between A Day and B Day
    And the active school days are Monday through Friday
    And the schedule begins on "2025-09-01"
    And the default variant is "Normal"
    And there is a two-hour delay scheduled for "2025-09-03"
    And the schedule is created

  Scenario Outline: Determine day type for specific dates
    Given the Bladensburg schedule
    When I request the day type for <Date>
    Then the day type should be <Day Type>
    And the groups should be <Groups>

    Examples:
      | Date       | Day Type | Groups        |
      | 2025-09-01 | A Day    | 1A, 2A, 3A, 4A |
      | 2025-09-02 | B Day    | 1B, 2B, 3B, 4B |
      | 2025-09-16 | B Day    | 1B, 2B, 3B, 4B |
    
#   Scenario: Calculate meeting times for a week
#     Given the Bladensburg schedule
#     When I request meeting times for the week of "2025-09-01" to "2025-09-07"
#     Then the meeting times should be:
#       | Date       | Day Type | Groups         | Variant  |
#       | 2025-09-01 | A Day    | 1A, 2A, 3A, 4A | Normal   |
#       | 2025-09-02 | B Day    | 1B, 2B, 3B, 4B | Normal   |
#       | 2025-09-03 | A Day    | 1A, 2A, 3A, 4A | Two Hour Delay   |
#       | 2025-09-04 | B Day    | 1B, 2B, 3B, 4B | Normal   |
#       | 2025-09-05 | A Day    | 1A, 2A, 3A, 4A | Normal   |

#   Scenario: Calculate meeting times for a multi-week span
#     Given the Bladensburg schedule
#     When I request meeting times for the week of "2025-09-01" to "2025-09-14"
#     Then the meeting times should be:
#       | Date       | Day Type | Groups         | Variant  |
#       | 2025-09-01 | A Day    | 1A, 2A, 3A, 4A | Normal   |
#       | 2025-09-02 | B Day    | 1B, 2B, 3B, 4B | Normal   |
#       | 2025-09-03 | A Day    | 1A, 2A, 3A, 4A | Two Hour Delay   |
#       | 2025-09-04 | B Day    | 1B, 2B, 3B, 4B | Normal   |
#       | 2025-09-05 | A Day    | 1A, 2A, 3A, 4A | Normal   |
#       | 2025-09-08 | B Day    | 1B, 2B, 3B, 4B | Normal   |
#       | 2025-09-09 | A Day    | 1A, 2A, 3A, 4A | Normal   |
#       | 2025-09-10 | B Day    | 1B, 2B, 3B, 4B | Normal   |
#       | 2025-09-11 | A Day    | 1A, 2A, 3A, 4A | Normal   |
#       | 2025-09-12 | B Day    | 1B, 2B, 3B, 4B | Normal   |

#   Scenario: Handle two-hour delay variant on specific date
#     Given the Bladensburg schedule
#     When I request meeting times for "2025-09-03"
#     Then the day type should be "A Day"
#     And the groups should be "1A, 2A, 3A, 4A"
#     And the variant should be "Two Hour Delay"
#     And the time slots should be:
#       | Period | Start Time | End Time |
#       | 1      | 13:59      | 14:36    |
#       | 2      | 11:30      | 13:52    |
#       | 3      | 14:43      | 15:23    |
#       | 4      | 15:29      | 16:10    |

#   Scenario: Calculate meeting times for specific groups
#     Given the Bladensburg schedule starts on "2025-09-01"
#     When I request meeting times for group "1A" from "2025-09-01" to "2025-09-06"
#     Then the group should meet on:
#       | Date       | Day Type | Period | Start Time | End Time |
#       | 2025-09-01 | A Day    | 1      | 09:30      | 10:48    |
#       | 2025-09-01 | A Day    | 2      | 10:55      | 13:20    |
#       | 2025-09-01 | A Day    | 3      | 13:27      | 14:45    |
#       | 2025-09-01 | A Day    | 4      | 14:52      | 16:10    |
#       | 2025-09-03 | A Day    | 1      | 09:30      | 10:48    |
#       | 2025-09-03 | A Day    | 2      | 10:55      | 13:20    |
#       | 2025-09-03 | A Day    | 3      | 13:27      | 14:45    |
#       | 2025-09-03 | A Day    | 4      | 14:52      | 16:10    |
#       | 2025-09-05 | A Day    | 1      | 09:30      | 10:48    |
#       | 2025-09-05 | A Day    | 2      | 10:55      | 13:20    |
#       | 2025-09-05 | A Day    | 3      | 13:27      | 14:45    |
#       | 2025-09-05 | A Day    | 4      | 14:52      | 16:10    |
