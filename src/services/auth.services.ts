import User from "../models/user";
import Admin from "../models/admin";

const createUser = async (data: {}) => {
  try {
    const user = await User.create(data);
    return user;
  } catch (error) {
    throw error;
  }
};

const getOneUserByEmail = async (email: string) => {
  try {
    const user = await User.findOne({ email }).select("+password");
    return user;
  } catch (error) {
    throw error;
  }
};

const getOneAdminByEmail = async (email: string) => {
  try {
    const admin = await Admin.findOne({ email }).select("+password");
    return admin;
  } catch (error) {
    throw error;
  }
};



const authService = {
  createUser,
  getOneUserByEmail,
  getOneAdminByEmail,
};

export default authService;
