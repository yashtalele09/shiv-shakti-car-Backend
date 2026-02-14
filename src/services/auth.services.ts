import User from "../models/user";

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



const authService = {
  createUser,
  getOneUserByEmail,
};

export default authService;
